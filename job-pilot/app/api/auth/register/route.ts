import { connectToDatabase } from "@/lib/db";
import { handleApiError, successResponse, ApiError } from "@/lib/api";
import { buildOptionsResponse, resolveCorsHeaders } from "@/lib/cors";
import { hashPassword, signToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { User } from "@/models/User";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, validateRegisterInput } from "@/lib/validation";

export async function OPTIONS(request: Request) {
  return buildOptionsResponse(request);
}

export async function POST(request: Request) {
  const corsHeaders = resolveCorsHeaders(request);

  try {
    enforceRateLimit(request);
    await connectToDatabase();

    const body = await parseJsonBody(request);
    const { email, password, name } = validateRegisterInput(body);

    const existingUser = await User.exists({ email });

    if (existingUser) {
      throw new ApiError(409, "Email is already registered");
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
    });

    logger.info("User registered", {
      userId: user._id.toString(),
      email: user.email,
    });

    return successResponse(
      {
        message: "Registration successful",
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
        },
      },
      201,
      corsHeaders,
    );
  } catch (error) {
    return handleApiError(error, corsHeaders);
  }
}
