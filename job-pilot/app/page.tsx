import Link from "next/link";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-[var(--line)] bg-white/70 px-4 py-3 shadow-[var(--shadow)] backdrop-blur md:px-6">
          <div>
            <p className="font-['var(--font-space-grotesk)'] text-lg font-semibold tracking-tight text-stone-900">
              JobPilot
            </p>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              Career workspace
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-white"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              Get Started
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
              Built for active job seekers
            </div>

            <h1 className="mt-6 font-['var(--font-space-grotesk)'] text-4xl font-bold leading-tight tracking-tight text-stone-950 sm:text-5xl lg:text-7xl">
              Organize every application like your career depends on it.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
              Track roles, capture real application submissions from the browser,
              and keep your search pipeline clear, fast, and focused from first
              click to offer stage.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-[var(--accent)] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-stone-300 bg-white/80 px-6 py-3 text-center text-sm font-semibold text-stone-800 transition hover:bg-white"
              >
                Login
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Capture
                </p>
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  Save submitted applications from the extension instead of manually
                  re-entering each job.
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Track
                </p>
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  Keep role, company, status, notes, and applied date in one
                  responsive dashboard.
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Focus
                </p>
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  Cut the noise and stay locked on the applications that actually
                  move your career forward.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-8 h-24 w-24 rounded-full bg-orange-200/50 blur-2xl sm:h-36 sm:w-36" />
            <div className="absolute -right-2 bottom-8 h-28 w-28 rounded-full bg-lime-200/50 blur-2xl sm:h-40 sm:w-40" />

            <div className="relative rounded-[32px] border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow)] sm:p-7">
              <div className="rounded-[28px] bg-stone-950 p-5 text-white sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-orange-200">
                      Today&apos;s pipeline
                    </p>
                    <h2 className="mt-3 font-['var(--font-space-grotesk)'] text-2xl font-semibold">
                      14 active applications
                    </h2>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-100">
                    +3 this week
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-300">
                      Applied
                    </p>
                    <p className="mt-2 text-2xl font-semibold">08</p>
                  </div>
                  <div className="rounded-2xl bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-300">
                      Interviews
                    </p>
                    <p className="mt-2 text-2xl font-semibold">04</p>
                  </div>
                  <div className="rounded-2xl bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-300">
                      Response rate
                    </p>
                    <p className="mt-2 text-2xl font-semibold">29%</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-3xl border border-stone-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">Frontend Engineer</p>
                      <p className="text-sm text-stone-500">Notion</p>
                    </div>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      Submitted
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-stone-600">
                    Browser extension captured the application after submission and
                    added it to your tracker instantly.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-stone-200 bg-[var(--sage)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
                      Smart workflow
                    </p>
                    <p className="mt-3 text-sm leading-6 text-stone-700">
                      Only detect submitted applications, not random job pages or
                      inbox emails.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-stone-200 bg-orange-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                      Built to move fast
                    </p>
                    <p className="mt-3 text-sm leading-6 text-stone-700">
                      Responsive dashboard for desktop tracking and quick mobile
                      status updates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
