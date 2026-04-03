import mongoose from "mongoose";

import { ApiError } from "@/lib/api";

type UnknownRecord = Record<string, unknown>;

export type SanitizedJobInput = {
  company: string;
  role: string;
  jobLink: string;
  normalizedJobLink: string;
  status?: "applied" | "interview" | "rejected";
  appliedDate?: Date;
  notes?: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

const JOB_STATUSES = new Set(["applied", "interview", "rejected"]);

function assertPlainObject(value: unknown): asserts value is UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Invalid request body");
  }
}

function rejectDangerousKeys(value: unknown) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(rejectDangerousKeys);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      throw new ApiError(400, "Invalid request payload");
    }

    rejectDangerousKeys(nestedValue);
  }
}

function sanitizeString(value: unknown, fieldName: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be a string`);
  }

  const sanitized = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();

  if (!sanitized) {
    throw new ApiError(400, `${fieldName} is required`);
  }

  if (sanitized.length > maxLength) {
    throw new ApiError(400, `${fieldName} is too long`);
  }

  return sanitized;
}

function sanitizeOptionalString(value: unknown, fieldName: string, maxLength: number) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return sanitizeString(value, fieldName, maxLength);
}

function sanitizeEmail(value: unknown) {
  const email = sanitizeString(value, "email", 254).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email address");
  }

  return email;
}

function sanitizePassword(value: unknown) {
  if (typeof value !== "string") {
    throw new ApiError(400, "password must be a string");
  }

  const password = value.trim();

  if (password.length < 8 || password.length > 72) {
    throw new ApiError(400, "Password must be between 8 and 72 characters");
  }

  return password;
}

function sanitizeUrl(value: unknown) {
  const url = sanitizeString(value, "jobLink", 2048);

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new ApiError(400, "jobLink must be a valid URL");
    }

    return parsed.toString();
  } catch {
    throw new ApiError(400, "jobLink must be a valid URL");
  }
}

export function normalizeJobLink(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeStatus(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  const status = sanitizeString(value, "status", 32).toLowerCase();

  if (!JOB_STATUSES.has(status)) {
    throw new ApiError(400, "Invalid job status");
  }

  return status as SanitizedJobInput["status"];
}

function sanitizeDate(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(value as string);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid appliedDate");
  }

  return date;
}

export async function parseJsonBody(request: Request) {
  try {
    const body = await request.json();
    assertPlainObject(body);
    rejectDangerousKeys(body);
    return body;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "Invalid JSON payload");
  }
}

export function validateRegisterInput(body: UnknownRecord): RegisterInput {
  return {
    email: sanitizeEmail(body.email),
    password: sanitizePassword(body.password),
    name: sanitizeOptionalString(body.name, "name", 80),
  };
}

export function validateLoginInput(body: UnknownRecord): LoginInput {
  return {
    email: sanitizeEmail(body.email),
    password: sanitizePassword(body.password),
  };
}

export function validateJobCreateInput(body: UnknownRecord): SanitizedJobInput {
  const roleValue = body.role ?? body.title;
  const jobLinkValue = body.jobLink ?? body.url;
  const sanitizedJobLink = sanitizeUrl(jobLinkValue);

  return {
    company: sanitizeString(body.company, "company", 120),
    role: sanitizeString(roleValue, "role", 160),
    jobLink: sanitizedJobLink,
    normalizedJobLink: normalizeJobLink(sanitizedJobLink),
    status: sanitizeStatus(body.status) ?? "applied",
    appliedDate: sanitizeDate(body.appliedDate) ?? new Date(),
    notes: sanitizeOptionalString(body.notes, "notes", 4000),
  };
}

export function validateJobUpdateInput(body: UnknownRecord) {
  const updates: Partial<SanitizedJobInput> = {};

  if (body.status !== undefined) {
    updates.status = sanitizeStatus(body.status);
  }

  if (body.notes !== undefined) {
    updates.notes = sanitizeOptionalString(body.notes, "notes", 4000);
  }

  if (body.company !== undefined) {
    updates.company = sanitizeString(body.company, "company", 120);
  }

  if (body.role !== undefined || body.title !== undefined) {
    updates.role = sanitizeString(body.role ?? body.title, "role", 160);
  }

  if (body.jobLink !== undefined || body.url !== undefined) {
    const sanitizedJobLink = sanitizeUrl(body.jobLink ?? body.url);
    updates.jobLink = sanitizedJobLink;
    updates.normalizedJobLink = normalizeJobLink(sanitizedJobLink);
  }

  if (body.appliedDate !== undefined) {
    updates.appliedDate = sanitizeDate(body.appliedDate);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  return updates;
}

export function validateObjectId(value: string, fieldName = "id") {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return value;
}

export function validateStatusFilter(value: string | null) {
  if (!value) {
    return undefined;
  }

  return sanitizeStatus(value);
}
