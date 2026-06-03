import { NextResponse } from "next/server";
import {
  parseAnswersArray,
  parseNonEmptyString,
  parseTabLeavesCount,
} from "@/lib/api/validation";
import { EXAM_LOAD_ERROR_HE } from "@/lib/exam/errors";
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
      candidateSource?: unknown;
      examTypeId?: unknown;
    };

    const token = parseNonEmptyString(body.token, "token");
    const itemId = parseNonEmptyString(body.itemId, "itemId");
    const sessionCandidateSource =
      typeof body.candidateSource === "string"
        ? body.candidateSource.trim()
        : "";
    const sessionExamTypeId =
      typeof body.examTypeId === "string" ? body.examTypeId.trim() : "";

    if (!token || !itemId) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 400 });
    }

    const candidate = await verifyCandidateToken(token, itemId);

    if (!candidate) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 401 });
    }

    const examTypeId = candidate.examTypeId;
    const questionCount = getExamQuestionCount(examTypeId);
    const answers = parseAnswersArray(body.answers, questionCount);
    const tabLeavesCount = parseTabLeavesCount(body.tabLeavesCount);

    if (!answers) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 400 });
    }

    if (tabLeavesCount === null) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 400 });
    }

    if (
      candidate.status === EXAM_STATUS.SUBMITTED ||
      candidate.status === EXAM_STATUS.BLOCKED
    ) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 403 });
    }

    const score = gradeAnswers(examTypeId, answers);
    const status =
      tabLeavesCount > 0 ? EXAM_STATUS.BLOCKED : EXAM_STATUS.SUBMITTED;

    console.info("[api/submit] exam submitted", {
      itemId,
      examTypeId,
      examTypeLabel: candidate.examTypeLabel,
      sessionExamTypeId: sessionExamTypeId || undefined,
      candidateSource:
        candidate.candidateSource || sessionCandidateSource || undefined,
      score,
      tabLeavesCount,
      status,
    });

    await submitCandidateExam(itemId, score, tabLeavesCount, status);

    return NextResponse.json({ score, status });
  } catch (error) {
    console.error("[api/submit]", error);
    return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 500 });
  }
}
