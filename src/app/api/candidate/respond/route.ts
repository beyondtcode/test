import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import {
  CONFIRM_STATUS,
  getCandidateByToken,
  getScheduledCandidateRow,
  updateCandidateConfirmStatus,
} from "@/lib/monday";
import { scheduleExamInviteFromRow } from "@/lib/qstash/schedule-exam-invite";

export const runtime = "nodejs";

type RespondChoice = "approve" | "postpone";

function parseChoice(value: unknown): RespondChoice | null {
  const choice = parseNonEmptyString(value, "choice");
  if (choice === "approve" || choice === "postpone") {
    return choice;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: unknown;
      choice?: unknown;
    };

    const token = parseNonEmptyString(body.token, "token");
    const choice = parseChoice(body.choice);

    if (!token) {
      return NextResponse.json(
        { error: "קישור לא תקין — חסר מזהה." },
        { status: 400 }
      );
    }

    if (!choice) {
      return NextResponse.json(
        { error: "קישור לא תקין — בחירה לא חוקית." },
        { status: 400 }
      );
    }

    const candidate = await getCandidateByToken(token);

    if (!candidate) {
      return NextResponse.json(
        { error: "הקישור אינו תקין או שפג תוקפו." },
        { status: 404 }
      );
    }

    const status =
      choice === "approve"
        ? CONFIRM_STATUS.APPROVED
        : CONFIRM_STATUS.POSTPONED;

    await updateCandidateConfirmStatus(candidate.itemId, status);

    if (choice === "approve") {
      try {
        const row = await getScheduledCandidateRow(candidate.itemId);
        if (row) {
          await scheduleExamInviteFromRow(row);
        }
      } catch (scheduleError) {
        console.error(
          `[api/candidate/respond] QStash reschedule failed for item ${candidate.itemId}:`,
          scheduleError
        );
      }
    }

    return NextResponse.json({ ok: true, choice });
  } catch (error) {
    console.error("[api/candidate/respond]", error);
    return NextResponse.json(
      { error: "אירעה שגיאה בעדכון התשובה. נא לנסות שוב או לפנות למנהל הגיוס." },
      { status: 500 }
    );
  }
}
