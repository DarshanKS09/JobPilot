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
  ) => Promise<void>;
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
  ) => Promise<void>;
  onDelete: (jobId: string) => Promise<void>;
  busyJobId?: string | null;
};

const STATUS_OPTIONS: Array<{ label: string; value: JobStatus }> = [
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Rejected", value: "rejected" },
];

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

  function resetEditState() {
    setRole(job.role);
    setCompany(job.company);
    setJobLink(job.jobLink);
    setAppliedDate(initialAppliedDate);
    setNotes(job.notes || "");
    setStatus(job.status);
  }

  async function handleSave() {
    await onEdit(job._id, {
      role,
      company,
      jobLink,
      appliedDate,
      notes,
      status,
    });
    setIsEditing(false);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              placeholder="Role"
            />
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              placeholder="Company"
            />
            <input
              value={jobLink}
              onChange={(event) => setJobLink(event.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 md:col-span-2"
              placeholder="Job link"
            />
            <input
              type="date"
              value={appliedDate}
              onChange={(event) => setAppliedDate(event.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as JobStatus)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
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
            className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Notes"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleSave()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">{job.role}</h3>
              <p className="text-sm text-zinc-600">{job.company}</p>
            </div>
            <p className="text-sm text-zinc-500">
              Applied: {new Date(job.appliedDate).toLocaleDateString()}
            </p>
            {job.notes ? <p className="text-sm text-zinc-600">{job.notes}</p> : null}
            <a
              href={job.jobLink}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-zinc-900 underline underline-offset-2"
            >
              View job posting
            </a>
          </div>

          <div className="flex flex-col gap-3 md:min-w-44">
            <select
              value={job.status}
              disabled={isBusy}
              onChange={(event) =>
                void onStatusChange(job._id, event.target.value as JobStatus)
              }
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
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
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onDelete(job._id)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
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
