import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import { EXAM_LOAD_ERROR_HE } from "@/lib/exam/errors";
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
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 400 });
    }

    const candidate = await verifyCandidateToken(token, itemId);

    if (!candidate) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 401 });
    }

    if (
      candidate.status !== EXAM_STATUS.NOT_STARTED &&
      candidate.status !== EXAM_STATUS.IN_PROGRESS
    ) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 403 });
    }

    if (candidate.status === EXAM_STATUS.NOT_STARTED) {
      await startCandidateExam(itemId);
    }

    const examTypeId = candidate.examTypeId;

    return NextResponse.json({
      questions: getPublicQuestions(examTypeId),
      durationMs: getExamDurationMs(examTypeId),
      examTypeId,
      examTypeLabel: candidate.examTypeLabel,
    });
  } catch (error) {
    console.error("[api/start]", error);
    return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 500 });
  }
}
