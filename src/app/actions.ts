"use server";

import { signOut as nextAuthSignOut } from "@/auth";
import { isSameOriginMutation, invalidMutationResponse } from "@/lib/security";

export async function signOutAction(formData: FormData) {
  const referer = formData.get("__origin")?.toString();
  const request = new Request("https://n/", {
    headers: referer ? { origin: referer } : {},
  });

  if (!isSameOriginMutation(request)) {
    return invalidMutationResponse();
  }

  await nextAuthSignOut({ redirectTo: "/sign-in" });
}
