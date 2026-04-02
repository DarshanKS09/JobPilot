import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          JobPilot
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Minimal frontend for testing backend flows
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Use this UI to register, log in, add jobs, update statuses, and verify
          the Next.js API and MongoDB backend are working correctly.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Go to Login
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
