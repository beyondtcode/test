import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import { EXAM_LOAD_ERROR_HE } from "@/lib/exam/errors";
import { EXAM_STATUS, getCandidateByToken } from "@/lib/monday";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = parseNonEmptyString(body.token, "token");

    if (!token) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 400 });
    }

    const candidate = await getCandidateByToken(token);

    if (!candidate) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 404 });
    }

    if (candidate.status === EXAM_STATUS.NOT_STARTED) {
      return NextResponse.json({
        itemId: candidate.itemId,
        name: candidate.name,
        email: candidate.email,
        examTypeId: candidate.examTypeId,
        examTypeLabel: candidate.examTypeLabel,
        candidateSource: candidate.candidateSource,
        jobPosition: candidate.jobPosition,
      });
    }

    if (candidate.status === EXAM_STATUS.IN_PROGRESS) {
      return NextResponse.json(
        {
          itemId: candidate.itemId,
          name: candidate.name,
          email: candidate.email,
          examTypeId: candidate.examTypeId,
          examTypeLabel: candidate.examTypeLabel,
          candidateSource: candidate.candidateSource,
          jobPosition: candidate.jobPosition,
        },
        { status: 200 }
      );
    }

    if (candidate.status === EXAM_STATUS.SUBMITTED) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 403 });
    }

    if (candidate.status === EXAM_STATUS.BLOCKED) {
      return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 403 });
    }

    return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 403 });
  } catch (error) {
    console.error("[api/auth]", error);
    return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 500 });
  }
}
