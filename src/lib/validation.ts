import { z } from "zod";

const MAX_BCRYPT_PASSWORD_BYTES = 72;

const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Password is too long.")
  .refine(
    (value) => new TextEncoder().encode(value).byteLength <= MAX_BCRYPT_PASSWORD_BYTES,
    "Password must be 72 bytes or fewer.",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

const optionalNameSchema = z
  .string()
  .trim()
  .max(100, "Name is too long.")
  .refine(
    (value) =>
      !Array.from(value).some((ch) => {
        const code = ch.charCodeAt(0);
        return code < 0x20 || (code >= 0x7f && code <= 0x9f);
      }),
    "Name contains invalid characters.",
  )
  .transform((value) => value || undefined)
  .optional();

/** Only self-selectable roles are accepted during registration. */
export const registrationRoleSchema = z.enum(["TEACHER", "STUDENT"]);

export const registrationSchema = z
  .object({
    name: optionalNameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: registrationRoleSchema.default("STUDENT"),
  })
  .strict();

/** Used by the credentials provider. Its error is deliberately not exposed. */
export const credentialsSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export type RegistrationInput = z.output<typeof registrationSchema>;

export function safeTrim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}
