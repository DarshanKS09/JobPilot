import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { ApiError } from "@/lib/api";
import { env } from "@/lib/env";

export type AuthUser = {
  userId: string;
  email: string;
};

type TokenPayload = JwtPayload & AuthUser;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export function signToken(payload: AuthUser) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token required");
  }

  return authorization.slice("Bearer ".length).trim();
}

export function requireAuth(request: Request): AuthUser {
  const token = getBearerToken(request);
  const payload = verifyToken(token);

  if (!payload.userId || !payload.email) {
    throw new ApiError(401, "Invalid authentication token");
  }

  return {
    userId: payload.userId,
    email: payload.email,
  };
}
