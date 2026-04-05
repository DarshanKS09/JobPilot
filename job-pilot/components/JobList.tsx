"use client";

import { useState } from "react";

import type { Job, JobStatus } from "@/lib/api-client";

type JobListProps = {
  jobs: Job[];
  onStatusChange: (jobId: string, status: JobStatus) => Promise<void>;
  onEdit: (
    jobId: string,
    values: {
      role: string;
      company: string;
      jobLink: string;
      appliedDate: string;
      notes: string;
      status: JobStatus;
    },
  ) => Promise<boolean>;
  onDelete: (jobId: string) => Promise<void>;
  busyJobId?: string | null;
};

type JobCardProps = {
  job: Job;
  onStatusChange: (jobId: string, status: JobStatus) => Promise<void>;
  onEdit: (
    jobId: string,
    values: {
      role: string;
      company: string;
      jobLink: string;
      appliedDate: string;
      notes: string;
      status: JobStatus;
    },
  ) => Promise<boolean>;
  onDelete: (jobId: string) => Promise<void>;
  busyJobId?: string | null;
};

const STATUS_OPTIONS: Array<{ label: string; value: JobStatus }> = [
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Rejected", value: "rejected" },
];

const appliedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

function JobCard({
  job,
  onStatusChange,
  onEdit,
  onDelete,
  busyJobId,
}: JobCardProps) {
  const isBusy = busyJobId === job._id;
  const initialAppliedDate = job.appliedDate
    ? new Date(job.appliedDate).toISOString().slice(0, 10)
    : "";

  const [isEditing, setIsEditing] = useState(false);
  const [role, setRole] = useState(job.role);
  const [company, setCompany] = useState(job.company);
  const [jobLink, setJobLink] = useState(job.jobLink);
  const [appliedDate, setAppliedDate] = useState(initialAppliedDate);
  const [notes, setNotes] = useState(job.notes || "");
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [editError, setEditError] = useState("");

  function resetEditState() {
    setRole(job.role);
    setCompany(job.company);
    setJobLink(job.jobLink);
    setAppliedDate(initialAppliedDate);
    setNotes(job.notes || "");
    setStatus(job.status);
    setEditError("");
  }

  async function handleSave() {
    setEditError("");

    const didSave = await onEdit(job._id, {
      role,
      company,
      jobLink,
      appliedDate,
      notes,
      status,
    });

    if (didSave) {
      setIsEditing(false);
      return;
    }

    setEditError("Unable to save changes. Please check the values and try again.");
  }

  return (
    <div className="rounded-[28px] border border-stone-200 bg-white/90 p-5 shadow-[var(--shadow)] sm:p-6">
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              placeholder="Role"
            />
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              placeholder="Company"
            />
            <input
              value={jobLink}
              onChange={(event) => setJobLink(event.target.value)}
              className="rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 md:col-span-2"
              placeholder="Job link"
            />
            <input
              type="date"
              value={appliedDate}
              onChange={(event) => setAppliedDate(event.target.value)}
              className="rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as JobStatus)}
              className="rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              {STATUS_OPTIONS.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            placeholder="Notes"
          />

          {editError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {editError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleSave()}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                resetEditState();
                setIsEditing(false);
              }}
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                {job.status}
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                Career tracker
              </span>
            </div>
            <div>
              <h3 className="font-['var(--font-space-grotesk)'] text-2xl font-semibold text-stone-950">
                {job.role}
              </h3>
              <p className="text-sm text-stone-600">{job.company}</p>
            </div>
            <p className="text-sm text-stone-500">
              Applied: {appliedDateFormatter.format(new Date(job.appliedDate))}
            </p>
            {job.notes ? <p className="text-sm leading-7 text-stone-600">{job.notes}</p> : null}
            <a
              href={job.jobLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-semibold text-stone-900 underline underline-offset-4"
            >
              View job posting
            </a>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-52">
            <select
              value={job.status}
              disabled={isBusy}
              onChange={(event) =>
                void onStatusChange(job._id, event.target.value as JobStatus)
              }
              className="rounded-full border border-stone-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              {STATUS_OPTIONS.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onDelete(job._id)}
              className="rounded-full border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? "Working..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function JobList({
  jobs,
  onStatusChange,
  onEdit,
  onDelete,
  busyJobId,
}: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-stone-300 bg-white/85 p-8 text-center text-sm leading-7 text-stone-600">
        No jobs yet. Add one manually or use the Chrome extension to start tracking.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard
          key={job._id}
          job={job}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
          busyJobId={busyJobId}
        />
      ))}
    </div>
  );
}
