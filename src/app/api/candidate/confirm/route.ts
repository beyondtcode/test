import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import { formatConfirmGreetingName } from "@/lib/candidate/display-name";
import {
  formatScheduledExamDateDisplay,
  formatScheduledExamTimeDisplay,
} from "@/lib/candidate/respond-time-slots";
import {
  CONFIRM_STATUS,
  getCandidateItemIdByToken,
  getScheduledCandidateRow,
  MONDAY_PLACEHOLDER_SCHEDULED_DATE,
  updateCandidateConfirmStatus,
} from "@/lib/monday";
import { scheduleExamInviteFromRowWithResult } from "@/lib/qstash/schedule-exam-invite";

export const runtime = "nodejs";

const MISSING_DATE_ERROR =
  "לא הוגדר תאריך מבחן. נא לפנות למנהל הגיוס.";

async function resolveCandidateByToken(token: string) {
  const itemId = await getCandidateItemIdByToken(token);
  if (!itemId) {
    return null;
  }

  const row = await getScheduledCandidateRow(itemId);
  if (!row) {
    return null;
  }

  const scheduledDate = row.scheduledDate.trim();
  if (
    !scheduledDate ||
    scheduledDate === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date
  ) {
    return { error: MISSING_DATE_ERROR, status: 400 as const };
  }

  const dateLabel = formatScheduledExamDateDisplay(
    scheduledDate,
    row.scheduledTime
  );
  const timeLabel = formatScheduledExamTimeDisplay(
    scheduledDate,
    row.scheduledTime
  );

  if (!dateLabel || !timeLabel) {
    return { error: MISSING_DATE_ERROR, status: 400 as const };
  }

  return { row, dateLabel, timeLabel };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = parseNonEmptyString(searchParams.get("token"), "token");

    if (!token) {
      return NextResponse.json(
        { error: "קישור לא תקין — חסר מזהה." },
        { status: 400 }
      );
    }

    const resolved = await resolveCandidateByToken(token);

    if (!resolved) {
      return NextResponse.json(
        { error: "הקישור אינו תקין או שפג תוקפו." },
        { status: 404 }
      );
    }

    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    const { row, dateLabel, timeLabel } = resolved;

    return NextResponse.json({
      name: formatConfirmGreetingName(row.name),
      dateLabel,
      timeLabel,
      alreadyConfirmed: row.statusConfirm === CONFIRM_STATUS.APPROVED,
    });
  } catch (error) {
    console.error("[api/candidate/confirm] GET", error);
    return NextResponse.json(
      { error: "אירעה שגיאה בטעינת פרטי המבחן. נא לנסות שוב מאוחר יותר." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = parseNonEmptyString(body.token, "token");

    if (!token) {
      return NextResponse.json(
        { error: "קישור לא תקין — חסר מזהה." },
        { status: 400 }
      );
    }

    const resolved = await resolveCandidateByToken(token);

    if (!resolved) {
      return NextResponse.json(
        { error: "הקישור אינו תקין או שפג תוקפו." },
        { status: 404 }
      );
    }

    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    const { row } = resolved;

    const examInviteSchedule = await scheduleExamInviteFromRowWithResult(row);
    if (examInviteSchedule.status !== "scheduled") {
      console.error(
        `[api/candidate/confirm] QStash schedule issue for item ${row.itemId}:`,
        examInviteSchedule
      );
    }

    if (row.statusConfirm !== CONFIRM_STATUS.APPROVED) {
      await updateCandidateConfirmStatus(row.itemId, CONFIRM_STATUS.APPROVED);
    }

    return NextResponse.json({ ok: true, examInviteSchedule });
  } catch (error) {
    console.error("[api/candidate/confirm] POST", error);
    return NextResponse.json(
      { error: "אירעה שגיאה בעדכון האישור. נא לנסות שוב או לפנות למנהל הגיוס." },
      { status: 500 }
    );
  }
}
