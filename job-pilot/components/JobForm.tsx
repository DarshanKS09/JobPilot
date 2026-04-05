"use client";

import { useState, useTransition } from "react";

type JobFormProps = {
  onSubmit: (values: { role: string; company: string; jobLink: string }) => Promise<void>;
};

export function JobForm({ onSubmit }: JobFormProps) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setRole("");
    setCompany("");
    setJobLink("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        await onSubmit({ role, company, jobLink });
        resetForm();
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to add job",
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-stone-200 bg-white/85 p-5 shadow-[var(--shadow)] sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
            Manual entry
          </p>
          <h2 className="mt-2 font-['var(--font-space-grotesk)'] text-2xl font-semibold text-stone-950">
            Add a job application
          </h2>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            Save a role manually when you apply outside the extension flow.
          </p>
        </div>
        <div className="rounded-full bg-stone-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Responsive form
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-stone-700">Role</label>
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            suppressHydrationWarning
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            placeholder="Frontend Engineer"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-stone-700">Company</label>
          <input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            suppressHydrationWarning
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            placeholder="Notion"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-stone-700">Job link</label>
          <input
            value={jobLink}
            onChange={(event) => setJobLink(event.target.value)}
            suppressHydrationWarning
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            placeholder="https://company.com/job"
            required
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Adding..." : "Add Job"}
      </button>
    </form>
  );
}
