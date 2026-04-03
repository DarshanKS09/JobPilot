import { NextResponse } from "next/server";

import { applyCorsHeaders, type CorsHeadersInit } from "@/lib/cors";
import { logger } from "@/lib/logger";

type ApiPayload = Record<string, unknown> | { error: string };

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function successResponse(
  payload: ApiPayload,
  status = 200,
  corsHeaders?: CorsHeadersInit,
) {
  const response = NextResponse.json(payload, { status });
  applyCorsHeaders(response, corsHeaders);
  return response;
}

export function errorResponse(
  message: string,
  status = 500,
  corsHeaders?: CorsHeadersInit,
) {
  const response = NextResponse.json({ error: message }, { status });
  applyCorsHeaders(response, corsHeaders);
  return response;
}

export function handleApiError(error: unknown, corsHeaders?: CorsHeadersInit) {
  if (error instanceof Error) {
    logger.error("API request failed", {
      errorName: error.name,
      errorMessage: error.message,
    });
  } else {
    logger.error("API request failed", {
      errorMessage: "Unknown non-error value thrown",
    });
  }

  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode, corsHeaders);
  }

  if (
    error instanceof Error &&
    error.message.startsWith("Missing required environment variable:")
  ) {
    return errorResponse(
      "Server configuration is incomplete. Add the required environment variables and try again.",
      503,
      corsHeaders,
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    return errorResponse("Resource already exists", 409, corsHeaders);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ValidationError"
  ) {
    return errorResponse("Validation failed", 400, corsHeaders);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "MongooseServerSelectionError" ||
      error.name === "MongoServerSelectionError")
  ) {
    return errorResponse(
      "Database connection failed. Make sure MongoDB is running and MONGODB_URI is correct.",
      503,
      corsHeaders,
    );
  }

  return errorResponse("Internal server error", 500, corsHeaders);
}
