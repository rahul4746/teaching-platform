"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import {
  registrationSchema,
  type RegistrationInput,
} from "@/lib/validation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: zodResolver(registrationSchema) as never,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "STUDENT",
    },
    mode: "onTouched",
  });

  const watchedRole = watch("role");
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const submitForm = async (values: RegistrationInput) => {
    setGlobalError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response
        .json()
        .catch(() => ({ error: "Unable to create account." }));

      if (response.ok && data?.ok) {
        router.replace("/sign-in?registered=1");
        return;
      }

      const message =
        data?.error && typeof data.error === "string"
          ? data.error
          : "Unable to create account. Please check your details and try again.";
      setGlobalError(message);
    } catch {
      setGlobalError("Unable to create account. Please try again.");
    }
  };

  const roleHint =
    watchedRole === "TEACHER"
      ? "You’ll be able to upload lessons and share them privately."
      : "You’ll see lessons your teachers share with you.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-10">
      <Card className="w-full max-w-md shadow-xl ring-0 border-slate-200/70">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200">
              <UserPlus size={22} />
            </span>
          </div>
          <div>
            <CardTitle className="text-xl tracking-tight">Create your account</CardTitle>
            <CardDescription className="pt-1.5">
              Join Lessonly as a teacher or learner.
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(submitForm as never)} noValidate>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Display name <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Priya Nair"
                className="h-9"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[11px] font-medium text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

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
              {errors.email && (
                <p className="text-[11px] font-medium text-rose-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="h-9 pr-9"
                  aria-describedby="password-hint"
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
              <p id="password-hint" className="text-[11px] text-slate-500">
                At least 12 characters.
              </p>
              {errors.password && (
                <p className="text-[11px] font-medium text-rose-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">I am joining as</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as RegistrationInput["role"])
                    }
                  >
                    <SelectTrigger
                      id="role"
                      className="h-9 w-full"
                      aria-invalid={Boolean(errors.role)}
                    >
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">
                        <span className="inline-flex items-center gap-2">
                          <GraduationCap size={15} />
                          Student
                        </span>
                      </SelectItem>
                      <SelectItem value="TEACHER">
                        <span className="inline-flex items-center gap-2">
                          <BookOpen size={15} />
                          Teacher
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[11px] text-slate-500">{roleHint}</p>
              {errors.role && (
                <p className="text-[11px] font-medium text-rose-600">
                  {errors.role.message}
                </p>
              )}
            </div>

            {globalError && (
              <div
                role="alert"
                className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200/70"
              >
                {globalError}
              </div>
            )}

            <div className="rounded-xl bg-indigo-50/70 p-3 ring-1 ring-indigo-100">
              <div className="flex gap-2.5">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-indigo-600" />
                <p className="text-[11px] leading-4.5 text-indigo-900/80">
                  Your password is hashed before it leaves the device. Nothing is shared
                  without your permission.
                </p>
              </div>
            </div>
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
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Create account
                </>
              )}
            </Button>
            <p className="text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
