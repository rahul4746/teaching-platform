import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { getCurrentUser, hasRole, hasRoleVerified } from "@/lib/authz";
import { getR2BucketName, getR2Client } from "@/lib/r2";
import { isSameOriginMutation, jsonNoStore, badRequest, tooLarge, unsupportedMediaType, invalidMutationResponse } from "@/lib/security";
import { VIDEO_MAX_SIZE_BYTES, VIDEO_MIME_TYPES } from "@/lib/video-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonNoStore({ error: "Unauthorized." }, { status: 401 });
  if (!hasRole(user, "TEACHER", "ADMIN")) return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  if (!(await hasRoleVerified(user.id, "TEACHER")) && !(await hasRoleVerified(user.id, "ADMIN"))) {
    return jsonNoStore({ error: "Forbidden." }, { status: 403 });
  }
  if (!isSameOriginMutation(request)) return invalidMutationResponse();

  let body: { fileName?: unknown; contentType?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Unable to read the upload request.");
  }

  const fileName = typeof body.fileName === "string" ? body.fileName : "video.mp4";
  const contentType = typeof body.contentType === "string" ? body.contentType : "video/mp4";
  const size = typeof body.size === "number" ? body.size : 0;
  if (!Number.isSafeInteger(size) || size <= 0) return badRequest("Invalid video size.");
  if (size > VIDEO_MAX_SIZE_BYTES) return tooLarge(VIDEO_MAX_SIZE_BYTES);
  if (!VIDEO_MIME_TYPES.includes(contentType as (typeof VIDEO_MIME_TYPES)[number])) return unsupportedMediaType();

  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : ".mp4";
  const key = `videos/teacher-${user.id}/${randomUUID()}${extension}`;
  try {
    const uploadUrl = await getSignedUrl(
      getR2Client(),
      new PutObjectCommand({ Bucket: getR2BucketName(), Key: key, ContentType: contentType }),
      { expiresIn: 15 * 60 },
    );
    return jsonNoStore({ uploadUrl, key }, { status: 201 });
  } catch {
    return jsonNoStore({ error: "Unable to prepare the video upload." }, { status: 503 });
  }
}
