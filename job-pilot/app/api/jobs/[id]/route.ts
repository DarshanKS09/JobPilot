import { ApiError, handleApiError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { buildOptionsResponse, resolveCorsHeaders } from "@/lib/cors";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, validateJobUpdateInput, validateObjectId } from "@/lib/validation";
import { Job } from "@/models/Job";
import { Types } from "mongoose";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function OPTIONS(request: Request) {
  return buildOptionsResponse(request);
}

export async function PATCH(request: Request, context: RouteContext) {
  const corsHeaders = resolveCorsHeaders(request);

  try {
    enforceRateLimit(request);
    const authUser = requireAuth(request);
    await connectToDatabase();

    const { id } = await context.params;
    validateObjectId(id);
    const jobObjectId = new Types.ObjectId(id);

    const body = await parseJsonBody(request);
    const updates = validateJobUpdateInput(body);

    if (updates.normalizedJobLink) {
      const existingJob = await Job.exists({
        _id: { $ne: jobObjectId },
        userId: authUser.userId,
        normalizedJobLink: updates.normalizedJobLink,
      });

      if (existingJob) {
        logger.info("Duplicate job prevented", {
          userId: authUser.userId,
          normalizedJobLink: updates.normalizedJobLink,
        });
        throw new ApiError(409, "A job with this link already exists");
      }
    }

    const job = await Job.findOneAndUpdate(
      {
        _id: id,
        userId: authUser.userId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    return successResponse({ job }, 200, corsHeaders);
  } catch (error) {
    return handleApiError(error, corsHeaders);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const corsHeaders = resolveCorsHeaders(request);

  try {
    enforceRateLimit(request);
    const authUser = requireAuth(request);
    await connectToDatabase();

    const { id } = await context.params;
    validateObjectId(id);

    const deletedJob = await Job.findOneAndDelete({
      _id: id,
      userId: authUser.userId,
    });

    if (!deletedJob) {
      throw new ApiError(404, "Job not found");
    }

    return successResponse({ message: "Job deleted successfully" }, 200, corsHeaders);
  } catch (error) {
    return handleApiError(error, corsHeaders);
  }
}
