import { NextResponse } from "next/server";
import {
  parseAnswersArray,
  parseNonEmptyString,
  parseTabLeavesCount,
} from "@/lib/api/validation";
import { getExamQuestionCount, gradeAnswers } from "@/lib/exam/questions";
import {
  EXAM_STATUS,
  submitCandidateExam,
  verifyCandidateToken,
} from "@/lib/monday";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      itemId?: unknown;
      token?: unknown;
      answers?: unknown;
      tabLeavesCount?: unknown;
    };

    const token = parseNonEmptyString(body.token, "token");
    const itemId = parseNonEmptyString(body.itemId, "itemId");
    const answers = parseAnswersArray(body.answers, getExamQuestionCount());
    const tabLeavesCount = parseTabLeavesCount(body.tabLeavesCount);

    if (!token || !itemId) {
      return NextResponse.json(
        { error: "Token and itemId are required" },
        { status: 400 }
      );
    }

    const questionCount = getExamQuestionCount();
    if (!answers) {
      return NextResponse.json(
        { error: `Answers must be an array of ${questionCount} values` },
        { status: 400 }
      );
    }

    if (tabLeavesCount === null) {
      return NextResponse.json(
        { error: "tabLeavesCount must be a non-negative integer" },
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
      candidate.status === EXAM_STATUS.SUBMITTED ||
      candidate.status === EXAM_STATUS.BLOCKED
    ) {
      return NextResponse.json(
        { error: "Exam has already been finalized" },
        { status: 403 }
      );
    }

    const score = gradeAnswers(answers);
    const status =
      tabLeavesCount > 3 ? EXAM_STATUS.BLOCKED : EXAM_STATUS.SUBMITTED;

    await submitCandidateExam(itemId, score, tabLeavesCount, status);

    return NextResponse.json({ score, status });
  } catch (error) {
    console.error("[api/submit]", error);
    return NextResponse.json(
      { error: "Failed to submit exam" },
      { status: 500 }
    );
  }
}
