import { ApiError, handleApiError, successResponse } from "@/lib/api";
import { comparePassword, signToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { buildOptionsResponse, resolveCorsHeaders } from "@/lib/cors";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, validateLoginInput } from "@/lib/validation";
import { User } from "@/models/User";

export async function OPTIONS(request: Request) {
  return buildOptionsResponse(request);
}

export async function POST(request: Request) {
  const corsHeaders = resolveCorsHeaders(request);

  try {
    enforceRateLimit(request);
    await connectToDatabase();

    const body = await parseJsonBody(request);
    const { email, password } = validateLoginInput(body);

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      logger.warn("Login failed", { email, reason: "user_not_found" });
      throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      logger.warn("Login failed", {
        email,
        userId: user._id.toString(),
        reason: "invalid_password",
      });
      throw new ApiError(401, "Invalid email or password");
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
    });

    logger.info("Login successful", {
      userId: user._id.toString(),
      email: user.email,
    });

    return successResponse(
      {
        message: "Login successful",
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
        },
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return handleApiError(error, corsHeaders);
  }
}
