import { NextResponse } from "next/server";

import { env } from "@/lib/env";

const ALLOWED_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";

export type CorsHeadersInit = {
  origin: string | null;
};

export function resolveCorsHeaders(request: Request): CorsHeadersInit {
  return { origin: request.headers.get("origin") };
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) {
    return false;
  }

  if (env.allowedOrigins.includes(origin)) {
    return true;
  }

  if (!origin.startsWith("chrome-extension://")) {
    return false;
  }

  if (env.chromeExtensionIds.length === 0) {
    return true;
  }

  return env.chromeExtensionIds.some(
    (extensionId) => origin === `chrome-extension://${extensionId}`,
  );
}

export function applyCorsHeaders(
  response: NextResponse,
  corsHeaders?: CorsHeadersInit,
) {
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Vary", "Origin");

  if (corsHeaders?.origin && isAllowedOrigin(corsHeaders.origin)) {
    response.headers.set("Access-Control-Allow-Origin", corsHeaders.origin);
  }
}

export function buildOptionsResponse(request: Request) {
  const response = new NextResponse(null, { status: 204 });
  applyCorsHeaders(response, resolveCorsHeaders(request));
  return response;
}
