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
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {isLogin ? "Login to JobPilot" : "Create your account"}
        </h1>
        <p className="text-sm text-zinc-600">
          {isLogin
            ? "Sign in to manage your job applications."
            : "Register to start tracking applications."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
            placeholder="Minimum 8 characters"
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isPending ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-600">
        {isLogin ? "Need an account?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-zinc-900 underline underline-offset-2"
        >
          {isLogin ? "Register" : "Login"}
        </Link>
      </p>
    </div>
  );
}
