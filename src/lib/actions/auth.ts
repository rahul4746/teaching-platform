"use server";

import { AuthError } from "next-auth";
import { signIn as nextAuthSignIn } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { registrationSchema, type RegistrationInput } from "@/lib/validation";

export async function register(input: RegistrationInput) {
  try {
    const validated = registrationSchema.parse(input);

    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { error: "Email already exists" };
    }

    const hashedPassword = await hashPassword(validated.password);

    await db.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        passwordHash: hashedPassword,
        role: validated.role,
      },
    });

    return { success: "User created successfully" };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Something went wrong during registration" };
  }
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  try {
    await nextAuthSignIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error;
  }
}
