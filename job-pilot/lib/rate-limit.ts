import { ApiError } from "@/lib/api";
import { env } from "@/lib/env";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = global.rateLimitStore ?? new Map<string, RateLimitEntry>();
global.rateLimitStore = store;

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  return `${request.method}:${new URL(request.url).pathname}:${ipAddress}`;
}

export function enforceRateLimit(request: Request) {
  const now = Date.now();
  const key = getClientIdentifier(request);
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + env.rateLimitWindowMs,
    });
    return;
  }

  if (entry.count >= env.rateLimitMax) {
    throw new ApiError(429, "Too many requests");
  }

  entry.count += 1;
  store.set(key, entry);
}
