"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { apiRequest } from "@/lib/api-client";
import { setStoredToken } from "@/lib/client-auth";

type AuthFormProps = {
  mode: "login" | "register";
};

type AuthResponse = {
  token?: string;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isLogin = mode === "login";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const data = await apiRequest<AuthResponse>(
          isLogin ? "/api/auth/login" : "/api/auth/register",
          {
            method: "POST",
            body: {
              email,
              password,
            },
          },
        );

        if (isLogin) {
          if (!data.token) {
            throw new Error("Missing authentication token");
          }

          setStoredToken(data.token);
          router.push("/dashboard");
          return;
        }

        router.push("/login");
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Something went wrong",
        );
      }
    });
  }

  return (
    <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
      <div className="relative hidden min-h-full overflow-hidden bg-stone-950 p-10 text-white lg:block">
        <div className="absolute left-0 top-0 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90"
            >
              JobPilot
            </Link>
            <p className="mt-8 text-sm uppercase tracking-[0.26em] text-orange-200">
              Career control center
            </p>
            <h1 className="mt-4 font-['var(--font-space-grotesk)'] text-4xl font-bold leading-tight">
              {isLogin
                ? "Pick up your job search exactly where you left it."
                : "Start building a cleaner, smarter application workflow."}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-stone-300">
              {isLogin
                ? "Review applications, update statuses, and keep your momentum high with a workspace that stays organized."
                : "Create your account to track opportunities, manage follow-ups, and capture submitted applications faster."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
              What you get
            </p>
            <ul className="mt-4 space-y-3 text-sm text-stone-200">
              <li>Track every application, interview, and rejection in one place.</li>
              <li>Use the extension to save submitted applications quickly.</li>
              <li>Stay responsive on both desktop and mobile screens.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white/75 p-6 sm:p-8 lg:p-10">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 lg:hidden"
          >
            Back to Home
          </Link>

          <div className="mb-8 mt-6 space-y-3 lg:mt-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
              {isLogin ? "Welcome back" : "Create account"}
            </p>
            <h2 className="font-['var(--font-space-grotesk)'] text-3xl font-bold tracking-tight text-stone-950">
              {isLogin ? "Login to JobPilot" : "Get started with JobPilot"}
            </h2>
            <p className="text-sm leading-7 text-stone-600">
              {isLogin
                ? "Sign in to manage your applications and keep your career search moving."
                : "Register to create your personal application tracker and dashboard."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Please wait..." : isLogin ? "Login" : "Get Started"}
            </button>
          </form>

          <p className="mt-6 text-sm text-stone-600">
            {isLogin ? "Need an account?" : "Already have an account?"}{" "}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="font-semibold text-stone-950 underline underline-offset-4"
            >
              {isLogin ? "Get Started" : "Login"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
