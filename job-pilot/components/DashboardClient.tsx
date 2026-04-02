"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiRequest, type Job, type JobStatus } from "@/lib/api-client";
import { clearStoredToken, getStoredToken } from "@/lib/client-auth";
import { JobForm } from "@/components/JobForm";
import { JobList } from "@/components/JobList";

type JobsResponse = {
  jobs: Job[];
};

type JobResponse = {
  job: Job;
};

export function DashboardClient() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
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

  const loadJobs = useCallback(async (activeToken: string) => {
    setIsLoading(true);
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
  }, [handleProtectedError]);

  useEffect(() => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      router.replace("/login");
      return;
    }

    setToken(storedToken);
    void loadJobs(storedToken);
  }, [router, loadJobs]);

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

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              JobPilot Dashboard
            </h1>
            <p className="text-sm text-zinc-600">
              Track applications, update statuses, and manage jobs in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Logout
          </button>
        </div>

        <div className="space-y-6">
          <JobForm onSubmit={handleAddJob} />

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
              Loading jobs...
            </div>
          ) : (
            <JobList
              jobs={jobs}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              busyJobId={isRefreshing ? busyJobId : busyJobId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
