import { handleApiError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { buildOptionsResponse, resolveCorsHeaders } from "@/lib/cors";
import { connectToDatabase } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";

export async function OPTIONS(request: Request) {
  return buildOptionsResponse(request);
}

export async function GET(request: Request) {
  const corsHeaders = resolveCorsHeaders(request);

  try {
    enforceRateLimit(request);
    const authUser = requireAuth(request);
    await connectToDatabase();

    const user = await User.findById(authUser.userId).lean();

    return successResponse(
      {
        user: user
          ? {
              id: user._id.toString(),
              email: user.email,
              name: user.name ?? null,
            }
          : {
              id: authUser.userId,
              email: authUser.email,
              name: null,
            },
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return handleApiError(error, corsHeaders);
  }
}
