export type JobStatus = "applied" | "interview" | "rejected";

export type Job = {
  _id: string;
  role: string;
  company: string;
  status: JobStatus;
  jobLink: string;
  appliedDate: string;
  notes?: string;
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: Record<string, unknown>;
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", token, body }: ApiRequestOptions = {},
) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = (await response.json().catch(() => null)) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}
