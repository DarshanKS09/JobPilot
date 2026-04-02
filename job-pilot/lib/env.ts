type EnvKey =
  | "MONGODB_URI"
  | "JWT_SECRET"
  | "JWT_EXPIRES_IN"
  | "ALLOWED_ORIGINS"
  | "CHROME_EXTENSION_IDS"
  | "RATE_LIMIT_WINDOW_MS"
  | "RATE_LIMIT_MAX";

function getEnv(key: EnvKey, fallback?: string): string {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  get mongoUri() {
    return getEnv("MONGODB_URI");
  },
  get jwtSecret() {
    return getEnv("JWT_SECRET");
  },
  get jwtExpiresIn() {
    return getEnv("JWT_EXPIRES_IN", "7d");
  },
  get allowedOrigins() {
    return getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  },
  get chromeExtensionIds() {
    return (process.env.CHROME_EXTENSION_IDS ?? "")
      .split(",")
      .map((extensionId) => extensionId.trim())
      .filter(Boolean);
  },
  get rateLimitWindowMs() {
    return parseNumber(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 60000);
  },
  get rateLimitMax() {
    return parseNumber(process.env.RATE_LIMIT_MAX ?? "100", 100);
  },
};
