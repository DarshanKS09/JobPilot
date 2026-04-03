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
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-zinc-900">Add Job</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <input
          value={role}
          onChange={(event) => setRole(event.target.value)}
          suppressHydrationWarning
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="Role"
          required
        />
        <input
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          suppressHydrationWarning
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="Company"
          required
        />
        <input
          value={jobLink}
          onChange={(event) => setJobLink(event.target.value)}
          suppressHydrationWarning
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="https://company.com/job"
          required
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isPending ? "Adding..." : "Add Job"}
      </button>
    </form>
  );
}
