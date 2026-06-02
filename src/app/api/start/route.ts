import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import { getExamDurationMs, getPublicQuestions } from "@/lib/exam/questions";
import {
  EXAM_STATUS,
  startCandidateExam,
  verifyCandidateToken,
} from "@/lib/monday";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      itemId?: unknown;
      token?: unknown;
    };

    const token = parseNonEmptyString(body.token, "token");
    const itemId = parseNonEmptyString(body.itemId, "itemId");

    if (!token || !itemId) {
      return NextResponse.json(
        { error: "Token and itemId are required" },
        { status: 400 }
      );
    }

    const candidate = await verifyCandidateToken(token, itemId);

    if (!candidate) {
      return NextResponse.json(
        { error: "Invalid token or item" },
        { status: 401 }
      );
    }

    if (
      candidate.status !== EXAM_STATUS.NOT_STARTED &&
      candidate.status !== EXAM_STATUS.IN_PROGRESS
    ) {
      return NextResponse.json(
        { error: "Exam cannot be started in the current status" },
        { status: 403 }
      );
    }

    if (candidate.status === EXAM_STATUS.NOT_STARTED) {
      await startCandidateExam(itemId);
    }

    return NextResponse.json({
      questions: getPublicQuestions(),
      durationMs: getExamDurationMs(),
    });
  } catch (error) {
    console.error("[api/start]", error);
    return NextResponse.json(
      { error: "Failed to start exam" },
      { status: 500 }
    );
  }
}
