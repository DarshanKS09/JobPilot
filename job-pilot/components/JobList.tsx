"use client";

import type { Job, JobStatus } from "@/lib/api-client";

type JobListProps = {
  jobs: Job[];
  onStatusChange: (jobId: string, status: JobStatus) => Promise<void>;
  onDelete: (jobId: string) => Promise<void>;
  busyJobId?: string | null;
};

const STATUS_OPTIONS: Array<{ label: string; value: JobStatus }> = [
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Rejected", value: "rejected" },
];

export function JobList({
  jobs,
  onStatusChange,
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
      {jobs.map((job) => {
        const isBusy = busyJobId === job._id;

        return (
          <div
            key={job._id}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">{job.role}</h3>
                  <p className="text-sm text-zinc-600">{job.company}</p>
                </div>
                <p className="text-sm text-zinc-500">
                  Applied: {new Date(job.appliedDate).toLocaleDateString()}
                </p>
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
                  onClick={() => void onDelete(job._id)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Working..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
