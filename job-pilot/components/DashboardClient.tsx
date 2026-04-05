"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiRequest, type Job, type JobStatus } from "@/lib/api-client";
import { clearStoredToken, getStoredToken } from "@/lib/client-auth";
import { JobForm } from "@/components/JobForm";
import { JobList } from "@/components/JobList";

type JobsResponse = {
  jobs: Job[];
  exists?: boolean;
};

type JobResponse = {
  job: Job;
};

const DASHBOARD_REFRESH_INTERVAL_MS = 3000;

export function DashboardClient() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const handleProtectedError = useCallback(
    (loadError: unknown) => {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load jobs";

      if (message.toLowerCase().includes("token") || message.includes("401")) {
        clearStoredToken();
        router.replace("/login");
        return;
      }

      setError(message);
    },
    [router],
  );

  const loadJobs = useCallback(
    async (activeToken: string) => {
      setError("");

      try {
        const data = await apiRequest<JobsResponse>("/api/jobs", {
          token: activeToken,
        });
        setJobs(data.jobs);
      } catch (loadError) {
        handleProtectedError(loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [handleProtectedError],
  );

  useEffect(() => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      router.replace("/login");
      return;
    }

    setToken(storedToken);
    void loadJobs(storedToken);
  }, [router, loadJobs]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const activeToken = token;

    function refreshJobs() {
      void loadJobs(activeToken);
    }

    const pollTimer = window.setInterval(refreshJobs, DASHBOARD_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refreshJobs);
    document.addEventListener("visibilitychange", refreshJobs);

    return () => {
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", refreshJobs);
      document.removeEventListener("visibilitychange", refreshJobs);
    };
  }, [loadJobs, token]);

  useEffect(() => {
    if (!copyMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setCopyMessage(""), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  async function handleAddJob(values: {
    role: string;
    company: string;
    jobLink: string;
  }) {
    if (!token) {
      throw new Error("You must be logged in");
    }

    await apiRequest<JobResponse>("/api/jobs", {
      method: "POST",
      token,
      body: values,
    });

    await loadJobs(token);
  }

  async function handleStatusChange(jobId: string, status: JobStatus) {
    if (!token) {
      return;
    }

    setBusyJobId(jobId);
    setError("");

    try {
      await apiRequest<JobResponse>(`/api/jobs/${jobId}`, {
        method: "PATCH",
        token,
        body: { status },
      });

      startTransition(() => {
        setJobs((currentJobs) =>
          currentJobs.map((job) => (job._id === jobId ? { ...job, status } : job)),
        );
      });
    } catch (updateError) {
      handleProtectedError(updateError);
    } finally {
      setBusyJobId(null);
    }
  }

  async function handleEditJob(
    jobId: string,
    values: {
      role: string;
      company: string;
      jobLink: string;
      appliedDate: string;
      notes: string;
      status: JobStatus;
    },
  ) {
    if (!token) {
      return false;
    }

    setBusyJobId(jobId);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        role: values.role.trim(),
        company: values.company.trim(),
        jobLink: values.jobLink.trim(),
        status: values.status,
      };

      if (values.appliedDate) {
        payload.appliedDate = new Date(`${values.appliedDate}T00:00:00.000Z`).toISOString();
      }

      if (values.notes.trim()) {
        payload.notes = values.notes.trim();
      }

      const response = await apiRequest<JobResponse>(`/api/jobs/${jobId}`, {
        method: "PATCH",
        token,
        body: payload,
      });

      startTransition(() => {
        setJobs((currentJobs) =>
          currentJobs.map((job) => (job._id === jobId ? response.job : job)),
        );
      });
      return true;
    } catch (updateError) {
      handleProtectedError(updateError);
      return false;
    } finally {
      setBusyJobId(null);
    }
  }

  async function handleDelete(jobId: string) {
    if (!token) {
      return;
    }

    setBusyJobId(jobId);
    setError("");

    try {
      await apiRequest(`/api/jobs/${jobId}`, {
        method: "DELETE",
        token,
      });

      startTransition(() => {
        setJobs((currentJobs) => currentJobs.filter((job) => job._id !== jobId));
      });
    } catch (deleteError) {
      handleProtectedError(deleteError);
    } finally {
      setBusyJobId(null);
    }
  }

  function handleLogout() {
    clearStoredToken();
    router.replace("/login");
  }

  async function handleCopyToken() {
    if (!token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      setCopyMessage("Token copied.");
    } catch {
      setCopyMessage("Unable to copy token.");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] bg-stone-950 p-6 text-white sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">
                Application command center
              </p>
              <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="font-['var(--font-space-grotesk)'] text-3xl font-bold tracking-tight sm:text-4xl">
                    JobPilot Dashboard
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300">
                    Track submissions, manage follow-ups, and keep your career
                    search organized across every stage.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  suppressHydrationWarning
                  className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
                >
                  Logout
                </button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-white/6 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                    Total jobs
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{jobs.length}</p>
                </div>
                <div className="rounded-3xl bg-white/6 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                    Interviews
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {jobs.filter((job) => job.status === "interview").length}
                  </p>
                </div>
                <div className="rounded-3xl bg-white/6 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                    Applied
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {jobs.filter((job) => job.status === "applied").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white/80 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-['var(--font-space-grotesk)'] text-2xl font-semibold text-stone-950">
                    Extension Access
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    Copy your JWT token into the JobPilot extension to enable
                    browser saves after an application is submitted.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyToken()}
                  suppressHydrationWarning
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                >
                  Copy Token
                </button>
              </div>

              <div className="mt-6 rounded-3xl bg-orange-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                  Reminder
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-700">
                  The extension now only reacts to real application submission
                  confirmations, not inbox or generic job pages.
                </p>
              </div>

              {copyMessage ? (
                <p className="mt-4 text-sm font-medium text-stone-600">{copyMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <JobForm onSubmit={handleAddJob} />

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {isLoading ? (
              <div className="rounded-[28px] border border-stone-200 bg-white p-6 text-sm text-stone-600">
                Loading jobs...
              </div>
            ) : (
              <JobList
                jobs={jobs}
                onStatusChange={handleStatusChange}
                onEdit={handleEditJob}
                onDelete={handleDelete}
                busyJobId={isRefreshing ? busyJobId : busyJobId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
