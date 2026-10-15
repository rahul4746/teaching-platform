import { z } from "zod";

import { getCurrentUser, canManageVideo, canViewVideo, hasRoleVerified } from "@/lib/authz";
import { db } from "@/lib/db";
import { emailSchema } from "@/lib/validation";
import {
  badRequest,
  isSameOriginMutation,
  jsonNoStore,
  invalidMutationResponse,
  notFound,
} from "@/lib/security";
import { safeTrim } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  email: emailSchema,
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });

  const video = await db.video.findUnique({ where: { id } });
  if (!video) return notFound("Lesson not found.");

  if (!canManageVideo(user, video) && user.role !== "ADMIN") {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  const enrollments = await db.enrollment.findMany({
    where: { videoId: video.id },
    orderBy: { grantedAt: "desc" },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return jsonNoStore({
    enrollments: enrollments.map((enrollment) => ({
      id: enrollment.id,
      studentId: enrollment.studentId,
      name: enrollment.student.name ?? null,
      email: enrollment.student.email,
      joinedAt: enrollment.grantedAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });
  if (!isSameOriginMutation(request)) return invalidMutationResponse();

  const video = await db.video.findUnique({ where: { id } });
  if (!video) return notFound("Lesson not found.");
  if (!canManageVideo(user, video)) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  // Additional database verification for sensitive operations
  const isTeacherVerified = await hasRoleVerified(user.id, "TEACHER");
  const isAdminVerified = await hasRoleVerified(user.id, "ADMIN");
  if (!isTeacherVerified && !isAdminVerified) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Unable to read the invitation.");
  }

  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return badRequest(first?.message ?? "Enter a valid student email.");
  }

  const email = safeTrim(parsed.data.email).toLowerCase();

  const student = await db.user.findUnique({ where: { email } });
  if (!student) {
    return badRequest(
      "No Lessonly account uses that email yet. Ask them to create a student account first, then invite them.",
    );
  }
  if (student.role !== "STUDENT") {
    return badRequest("That account is not a student account.");
  }

  const existing = await db.enrollment.findFirst({
    where: { videoId: video.id, studentId: student.id },
  });
  if (existing) {
    return jsonNoStore({
      ok: true,
      added: false,
      message: "That student is already invited to this lesson.",
      enrollment: {
        id: existing.id,
        studentId: existing.studentId,
        email,
      },
    });
  }

  const enrollment = await db.enrollment.create({
    data: {
      videoId: video.id,
      studentId: student.id,
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
  });

  return jsonNoStore(
    {
      ok: true,
      added: true,
      enrollment: {
        id: enrollment.id,
        studentId: enrollment.studentId,
        name: enrollment.student.name ?? null,
        email: enrollment.student.email,
        joinedAt: enrollment.grantedAt.toISOString(),
      },
    },
    { status: 201 }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });
  if (!isSameOriginMutation(request)) return invalidMutationResponse();

  const video = await db.video.findUnique({ where: { id } });
  if (!video) return notFound("Lesson not found.");
  if (!canManageVideo(user, video)) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  // Additional database verification for sensitive operations
  const isTeacherVerified = await hasRoleVerified(user.id, "TEACHER");
  const isAdminVerified = await hasRoleVerified(user.id, "ADMIN");
  if (!isTeacherVerified && !isAdminVerified) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  if (!studentId) {
    return badRequest("Missing student.");
  }

  const existing = await db.enrollment.findFirst({
    where: { videoId: video.id, studentId },
  });
  if (!existing) return jsonNoStore({ ok: true, removed: false });

  await db.enrollment.delete({ where: { id: existing.id } });
  return jsonNoStore({ ok: true, removed: true });
}