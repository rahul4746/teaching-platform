import { getCurrentUser, canViewVideo } from "@/lib/authz";
import { db } from "@/lib/db";
import { z } from "zod";
import { badRequest, jsonNoStore, notFound } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const progressSchema = z.object({
  currentTime: z.number().int().min(0).max(24 * 60 * 60),
  completed: z.boolean().optional(),
});

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
      enrollments: { where: { studentId: user.id }, select: { id: true } },
    },
  });
  if (!video) return notFound("Lesson not found.");

  const hasEnrollment = video.enrollments.length > 0;
  if (!canViewVideo(user, video, hasEnrollment)) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  const progress = await db.videoProgress.findUnique({
    where: { videoId_studentId: { videoId: id, studentId: user.id } },
  });

  return jsonNoStore({
    progress: progress
      ? {
          currentTime: progress.currentTime,
          completed: progress.completed,
          lastWatched: progress.lastWatched.toISOString(),
        }
      : null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });

  const video = await db.video.findUnique({
    where: { id },
    include: {
      enrollments: { where: { studentId: user.id }, select: { id: true } },
    },
  });
  if (!video) return notFound("Lesson not found.");

  const hasEnrollment = video.enrollments.length > 0;
  if (!canViewVideo(user, video, hasEnrollment)) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Unable to read the request.");
  }

  const parsed = progressSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Progress must include a valid currentTime.");
  }

  const { currentTime, completed } = parsed.data;

  const progress = await db.videoProgress.upsert({
    where: { videoId_studentId: { videoId: id, studentId: user.id } },
    create: {
      videoId: id,
      studentId: user.id,
      currentTime,
      completed: completed ?? false,
    },
    update: {
      currentTime,
      completed: completed ?? undefined,
      lastWatched: new Date(),
    },
  });

  return jsonNoStore({
    ok: true,
    progress: {
      currentTime: progress.currentTime,
      completed: progress.completed,
    },
  });
}
