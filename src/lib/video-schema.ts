import { z } from "zod";

const MEGABYTE = 1024 * 1024;

export const VIDEO_MAX_SIZE_BYTES = 5 * 1024 * 1024 * MEGABYTE;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

const titleSchema = z
  .string()
  .trim()
  .min(3, "Title must be at least 3 characters.")
  .max(140, "Title is too long.");

const descriptionSchema = z
  .string()
  .trim()
  .max(5000, "Description is too long.")
  .transform((value) => value || undefined)
  .optional();

const categorySchema = z
  .string()
  .trim()
  .max(80, "Category is too long.")
  .transform((value) => value || undefined)
  .optional();

const tagSchema = z
  .string()
  .trim()
  .max(40, "Tag is too long.")
  .refine((value) => value.length > 0, "Tag cannot be empty.");

const tagsSchema = z
  .array(tagSchema)
  .max(12, "Too many tags.")
  .default([]);

const mimeTypeSchema = z.enum(VIDEO_MIME_TYPES);

const isPublicSchema = z.boolean().default(false);

const videoUrlSchema = z.string().trim().url("Video URL must be valid.");

const thumbnailUrlSchema = z
  .string()
  .trim()
  .url("Thumbnail URL must be valid.")
  .or(z.literal(""))
  .transform((value) => value || undefined)
  .optional();

export const createVideoSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    category: categorySchema,
    tags: tagsSchema,
    videoUrl: videoUrlSchema,
    thumbnailUrl: thumbnailUrlSchema,
    size: z.coerce.bigint().nonnegative(),
    mimeType: mimeTypeSchema,
    duration: z.coerce.number().int().nonnegative().optional(),
    isPublic: isPublicSchema,
  })
  .strict();

export const updateVideoSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    category: categorySchema.optional(),
    tags: tagsSchema.optional(),
    thumbnailUrl: thumbnailUrlSchema.optional(),
    isPublic: isPublicSchema.optional(),
  })
  .strict();

export type CreateVideoInput = z.output<typeof createVideoSchema>;
export type UpdateVideoInput = z.output<typeof updateVideoSchema>;
