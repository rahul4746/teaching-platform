import type { Prisma } from "@prisma/client";

import { getCurrentUser, hasRole, hasRoleVerified } from "@/lib/authz";
import { db } from "@/lib/db";
import { getVideoStreamUrl } from "@/lib/r2";
import { badRequest, invalidMutationResponse, isSameOriginMutation, jsonNoStore, unsupportedMediaType } from "@/lib/security";
import { uploadRateLimiter, getClientIdentifier } from "@/lib/rate-limit";
import { VIDEO_MIME_TYPES, createVideoSchema, type CreateVideoInput } from "@/lib/video-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateVideoBody = {
  title?: unknown; description?: unknown; category?: unknown; tags?: unknown;
  isPublic?: unknown; duration?: unknown; size?: unknown; mimeType?: unknown; uploadKey?: unknown;
};

function coerceTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof raw !== "string") return [];
  return raw.split(/[,\n]+/).map((tag) => tag.trim()).filter(Boolean);
}

export async function POST(request: Request) {
  const rateLimitResult = uploadRateLimiter(getClientIdentifier(request));
  if (rateLimitResult && !rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    return jsonNoStore({ error: "Upload limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });
  if (!hasRole(user, "TEACHER", "ADMIN")) return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  if (!(await hasRoleVerified(user.id, "TEACHER")) && !(await hasRoleVerified(user.id, "ADMIN"))) return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  if (!isSameOriginMutation(request)) return invalidMutationResponse();

  let body: CreateVideoBody;
  try { body = await request.json(); } catch { return badRequest("Unable to read the upload details."); }

  const uploadKey = typeof body.uploadKey === "string" ? body.uploadKey : "";
  if (!uploadKey.startsWith(`videos/teacher-${user.id}/`)) return badRequest("Invalid video upload.");

  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "video/mp4";
  if (!VIDEO_MIME_TYPES.includes(mimeType as (typeof VIDEO_MIME_TYPES)[number])) return unsupportedMediaType();

  const rawInput: Partial<CreateVideoInput> = {
    title: typeof body.title === "string" ? body.title.trim() : "",
    description: typeof body.description === "string" ? body.description : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    tags: coerceTags(body.tags), isPublic: body.isPublic === true,
    size: typeof body.size === "number" ? BigInt(body.size) : BigInt(0),
    mimeType: mimeType as never, duration: typeof body.duration === "number" ? body.duration : undefined,
    videoUrl: "https://r2.invalid/video",
  };
  const parsed = createVideoSchema.safeParse(rawInput);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Please check your details and try again.");
  const input = parsed.data;

  const create: Prisma.VideoCreateInput = {
    title: input.title, description: input.description ?? null, category: input.category ?? null,
    tags: input.tags, videoUrl: "pending://video", storageKey: uploadKey, thumbnailUrl: null,
    size: input.size, mimeType, duration: input.duration ?? null, isPublic: input.isPublic,
    status: "PROCESSING", teacher: { connect: { id: user.id } }, viewCount: 0,
  };
  const video = await db.video.create({ data: create });
  const updated = await db.video.update({
    where: { id: video.id }, data: { videoUrl: getVideoStreamUrl(video.id) },
    select: { id: true, title: true, description: true, category: true, tags: true, videoUrl: true, thumbnailUrl: true, duration: true, size: true, mimeType: true, isPublic: true, status: true, teacherId: true, createdAt: true, updatedAt: true, viewCount: true },
  });

  return jsonNoStore({ ok: true, video: { ...updated, size: updated.size.toString(), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } }, { status: 201 });
}
