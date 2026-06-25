import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import { resolveExamAuthAccess } from "@/lib/exam/access-window";
import { EXAM_LOAD_ERROR_HE } from "@/lib/exam/errors";
import { getExamDurationMs, getPublicQuestions } from "@/lib/exam/questions";
import { EXAM_STATUS, startCandidateExam, verifyCandidateToken } from "@/lib/monday";

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

    const access = await resolveExamAuthAccess(candidate);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error, reason: access.reason },
        { status: 403 }
      );
    }

    if (
      access.phase === "welcome" &&
      (candidate.status === EXAM_STATUS.NOT_STARTED ||
        candidate.status === EXAM_STATUS.SEND_EXAM_NOW)
    ) {
      await startCandidateExam(itemId);
    }

    const examTypeId = candidate.examTypeId;

    return NextResponse.json({
      questions: getPublicQuestions(examTypeId),
      durationMs: getExamDurationMs(examTypeId),
      examTypeId,
      examTypeLabel: candidate.examTypeLabel,
      allowedPhase: access.phase,
    });
  } catch (error) {
    console.error("[api/start]", error);
    return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 500 });
  }
}
