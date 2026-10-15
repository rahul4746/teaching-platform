import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getCurrentUser, canViewVideo } from "@/lib/authz";
import { db } from "@/lib/db";
import { getR2BucketName, getR2Client } from "@/lib/r2";
import { jsonNoStore, notFound } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    select: { id: true, storageKey: true, videoUrl: true, isPublic: true, teacherId: true, enrollments: { where: { studentId: user.id }, select: { id: true } } },
  });
  if (!video) return notFound("Lesson not found.");
  if (!canViewVideo(user, video, video.enrollments.length > 0)) return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  if (!video.storageKey) return notFound("Video file not found.");

  try {
    const url = await getSignedUrl(getR2Client(), new GetObjectCommand({ Bucket: getR2BucketName(), Key: video.storageKey }), { expiresIn: 60 * 60 });
    return Response.redirect(url, 302);
  } catch {
    return jsonNoStore({ error: "Unable to prepare video playback." }, { status: 503 });
  }
}
