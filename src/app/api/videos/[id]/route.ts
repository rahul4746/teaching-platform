import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { getCurrentUser, canManageVideo, canViewVideo, hasRoleVerified } from "@/lib/authz";
import { db } from "@/lib/db";
import { getR2BucketName, getR2Client } from "@/lib/r2";
import { updateVideoSchema, type UpdateVideoInput } from "@/lib/video-schema";
import {
  badRequest,
  isSameOriginMutation,
  jsonNoStore,
  invalidMutationResponse,
  notFound,
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });

  const video = await db.video.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true } },
      enrollments: { where: { studentId: user.id }, select: { id: true } },
    },
  });
  if (!video) return notFound("Lesson not found.");

  const hasEnrollment = video.enrollments.length > 0;
  if (!canViewVideo(user, video, hasEnrollment)) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  return jsonNoStore({
    video: {
      id: video.id,
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      mimeType: video.mimeType,
      status: video.status,
      isPublic: video.isPublic,
      viewCount: video.viewCount,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      teacher: video.teacher,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });
  if (!isSameOriginMutation(request)) return invalidMutationResponse();

  const existing = await db.video.findUnique({ where: { id } });
  if (!existing) return notFound("Lesson not found.");
  if (!canManageVideo(user, existing)) {
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
    return badRequest("Unable to read the request.");
  }

  const parsed = updateVideoSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return badRequest(first?.message ?? "Unable to update that lesson.");
  }

  const patch = parsed.data as UpdateVideoInput;
  const changes: Record<string, unknown> = {};
  if (patch.title !== undefined) changes.title = patch.title;
  if (patch.description !== undefined) changes.description = patch.description ?? null;
  if (patch.category !== undefined) changes.category = patch.category ?? null;
  if (patch.tags) changes.tags = patch.tags;
  if (patch.thumbnailUrl !== undefined) changes.thumbnailUrl = patch.thumbnailUrl ?? null;
  if (patch.isPublic !== undefined) changes.isPublic = patch.isPublic;
  if (Object.keys(changes).length === 0) {
    return jsonNoStore({ ok: true, updated: { id: existing.id } });
  }

  const updated = await db.video.update({
    where: { id: existing.id },
    data: changes,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      tags: true,
      thumbnailUrl: true,
      isPublic: true,
      updatedAt: true,
    },
  });

  return jsonNoStore({
    ok: true,
    video: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(request, context);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });
  if (!isSameOriginMutation(request)) return invalidMutationResponse();

  const existing = await db.video.findUnique({ where: { id } });
  if (!existing) return jsonNoStore({ ok: true, deleted: false });
  if (!canManageVideo(user, existing)) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  // Additional database verification for sensitive operations
  const isTeacherVerified = await hasRoleVerified(user.id, "TEACHER");
  const isAdminVerified = await hasRoleVerified(user.id, "ADMIN");
  if (!isTeacherVerified && !isAdminVerified) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  try {
    if (existing.storageKey) {
      await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: existing.storageKey }));
    }
  } catch {
    // Non-fatal: allow DB delete regardless of blob-cleanup success.
  }

  await db.enrollment.deleteMany({ where: { videoId: existing.id } });
  await db.videoProgress.deleteMany({ where: { videoId: existing.id } });
  await db.video.delete({ where: { id: existing.id } });

  return jsonNoStore({
    ok: true,
    deleted: true,
    id: existing.id,
  });
}
