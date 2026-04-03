import { ApiError, handleApiError, successResponse } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { buildOptionsResponse, resolveCorsHeaders } from "@/lib/cors";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  normalizeJobLink,
  parseJsonBody,
  validateJobCreateInput,
  validateStatusFilter,
} from "@/lib/validation";
import { Job } from "@/models/Job";

export async function OPTIONS(request: Request) {
  return buildOptionsResponse(request);
}

export async function GET(request: Request) {
  const corsHeaders = resolveCorsHeaders(request);

  try {
    enforceRateLimit(request);
    const authUser = requireAuth(request);
    await connectToDatabase();

    const url = new URL(request.url);
    const status = validateStatusFilter(url.searchParams.get("status"));
    const jobLink = url.searchParams.get("jobLink");
    const normalizedJobLink = jobLink ? normalizeJobLink(jobLink) : undefined;
    const query = {
      userId: authUser.userId,
      ...(status ? { status } : {}),
      ...(normalizedJobLink ? { normalizedJobLink } : {}),
    };

    const jobs = await Job.find(query)
      .sort({ appliedDate: -1, createdAt: -1 })
      .lean();

    return successResponse(
      {
        jobs,
        exists: Boolean(normalizedJobLink && jobs.length > 0),
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return handleApiError(error, corsHeaders);
  }
}

export async function POST(request: Request) {
  const corsHeaders = resolveCorsHeaders(request);

  try {
    enforceRateLimit(request);
    const authUser = requireAuth(request);
    await connectToDatabase();

    const body = await parseJsonBody(request);
    const jobInput = validateJobCreateInput(body);

    const existingJob = await Job.exists({
      userId: authUser.userId,
      normalizedJobLink: jobInput.normalizedJobLink,
    });

    if (existingJob) {
      logger.info("Duplicate job prevented", {
        userId: authUser.userId,
        normalizedJobLink: jobInput.normalizedJobLink,
      });
      throw new ApiError(409, "A job with this link already exists");
    }

    const job = await Job.create({
      userId: authUser.userId,
      ...jobInput,
    });

    logger.info("Job created", {
      userId: authUser.userId,
      jobId: job._id.toString(),
      company: job.company,
      role: job.role,
    });

    return successResponse({ job }, 201, corsHeaders);
  } catch (error) {
    return handleApiError(error, corsHeaders);
  }
}
