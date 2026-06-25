import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import { resolveExamAuthAccess } from "@/lib/exam/access-window";
import { EXAM_LOAD_ERROR_HE } from "@/lib/exam/errors";
import { getCandidateByToken } from "@/lib/monday";

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

    const access = await resolveExamAuthAccess(candidate);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error, reason: access.reason },
        { status: 403 }
      );
    }

    return NextResponse.json({
      itemId: candidate.itemId,
      name: candidate.name,
      email: candidate.email,
      examTypeId: candidate.examTypeId,
      examTypeLabel: candidate.examTypeLabel,
      candidateSource: candidate.candidateSource,
      jobPosition: candidate.jobPosition,
      allowedPhase: access.phase,
      examStatus: access.examStatus,
    });
  } catch (error) {
    console.error("[api/auth]", error);
    return NextResponse.json({ error: EXAM_LOAD_ERROR_HE }, { status: 500 });
  }
}
