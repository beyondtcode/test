import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import { EXAM_STATUS, getCandidateByToken } from "@/lib/monday";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = parseNonEmptyString(body.token, "token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const candidate = await getCandidateByToken(token);

    if (!candidate) {
      return NextResponse.json(
        { error: "Invalid or expired exam link" },
        { status: 404 }
      );
    }

    if (candidate.status === EXAM_STATUS.NOT_STARTED) {
      return NextResponse.json({
        itemId: candidate.itemId,
        name: candidate.name,
        email: candidate.email,
        jobPosition: candidate.jobPosition,
      });
    }

    if (candidate.status === EXAM_STATUS.IN_PROGRESS) {
      return NextResponse.json(
        { error: "This exam is already in progress" },
        { status: 403 }
      );
    }

    if (candidate.status === EXAM_STATUS.SUBMITTED) {
      return NextResponse.json(
        { error: "This exam has already been submitted" },
        { status: 403 }
      );
    }

    if (candidate.status === EXAM_STATUS.BLOCKED) {
      return NextResponse.json(
        { error: "This exam has been blocked" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Unknown exam status" },
      { status: 403 }
    );
  } catch (error) {
    console.error("[api/auth]", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
