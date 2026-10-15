"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";

import { credentialsSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SignInValues = { email: string; password: string };

function SignInCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") ?? "/";
  const registered = searchParams.get("registered") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(credentialsSchema as unknown as typeof credentialsSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const onSubmit = async (values: SignInValues) => {
    setGlobalError(null);
    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.ok && !result.error) {
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      setGlobalError("Invalid email or password.");
    } catch {
      setGlobalError("Unable to sign in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-10">
      <Card className="w-full max-w-md shadow-xl ring-0 border-slate-200/70">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200">
              <BookOpen size={22} strokeWidth={2.2} />
            </span>
          </div>
          <div>
            <CardTitle className="text-xl tracking-tight">Welcome back</CardTitle>
            <CardDescription className="pt-1.5">
              Sign in to your teaching or learning space.
            </CardDescription>
          </div>
          {registered && (
            <div className="mt-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/70">
              Account created. Now sign in with your details.
            </div>
          )}
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@school.edu"
                className="h-9"
                aria-invalid={Boolean(errors.email || globalError)}
                {...register("email")}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-9 pr-9"
                  aria-invalid={Boolean(errors.password || globalError)}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {(errors.email || errors.password || globalError) && (
              <div
                role="alert"
                className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200/70"
              >
                {globalError ??
                  errors.email?.message ??
                  errors.password?.message ??
                  "Please check your details."}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button
              type="submit"
              size="lg"
              className="w-full h-9"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <p className="text-center text-xs text-slate-500">
              New here?{" "}
              <Link
                href="/register"
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-4"
              >
                Create an account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-hidden="true" />}>
      <SignInCard />
    </Suspense>
  );
}
