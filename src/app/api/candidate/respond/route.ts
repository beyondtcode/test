import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import {
  combineDateAndTime,
  formatAdminScheduledDateLabel,
  isRespondTimeSlot,
} from "@/lib/candidate/respond-time-slots";
import {
  confirmCandidateExamSchedule,
  getCandidateItemIdByToken,
  getScheduledCandidateRow,
  MONDAY_PLACEHOLDER_SCHEDULED_DATE,
} from "@/lib/monday";
import { scheduleExamInviteFromRow } from "@/lib/qstash/schedule-exam-invite";

export const runtime = "nodejs";

const MISSING_DATE_ERROR =
  "לא הוגדר תאריך מבחן. נא לפנות למנהל הגיוס.";

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

    const itemId = await getCandidateItemIdByToken(token);

    if (!itemId) {
      return NextResponse.json(
        { error: "הקישור אינו תקין או שפג תוקפו." },
        { status: 404 }
      );
    }

    const row = await getScheduledCandidateRow(itemId);
    const scheduledDate = row?.scheduledDate?.trim() ?? "";

    if (
      !scheduledDate ||
      scheduledDate === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date
    ) {
      return NextResponse.json({ error: MISSING_DATE_ERROR }, { status: 400 });
    }

    return NextResponse.json({
      scheduledDate,
      scheduledDateLabel: formatAdminScheduledDateLabel(scheduledDate),
    });
  } catch (error) {
    console.error("[api/candidate/respond] GET", error);
    return NextResponse.json(
      { error: "אירעה שגיאה בטעינת פרטי המבחן. נא לנסות שוב מאוחר יותר." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: unknown;
      time?: unknown;
    };

    const token = parseNonEmptyString(body.token, "token");
    const timeSlot = parseNonEmptyString(body.time, "time");

    if (!token) {
      return NextResponse.json(
        { error: "קישור לא תקין — חסר מזהה." },
        { status: 400 }
      );
    }

    if (!timeSlot || !isRespondTimeSlot(timeSlot)) {
      return NextResponse.json(
        { error: "שעת המבחן שנבחרה אינה חוקית." },
        { status: 400 }
      );
    }

    const itemId = await getCandidateItemIdByToken(token);

    if (!itemId) {
      return NextResponse.json(
        { error: "הקישור אינו תקין או שפג תוקפו." },
        { status: 404 }
      );
    }

    const row = await getScheduledCandidateRow(itemId);
    const scheduledDate = row?.scheduledDate?.trim() ?? "";

    if (
      !scheduledDate ||
      scheduledDate === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date
    ) {
      return NextResponse.json({ error: MISSING_DATE_ERROR }, { status: 400 });
    }

    const scheduledAt = combineDateAndTime(scheduledDate, timeSlot);
    await confirmCandidateExamSchedule(itemId, scheduledAt);

    try {
      const updatedRow = await getScheduledCandidateRow(itemId);
      if (updatedRow) {
        await scheduleExamInviteFromRow(updatedRow);
      }
    } catch (scheduleError) {
      console.error(
        `[api/candidate/respond] QStash reschedule failed for item ${itemId}:`,
        scheduleError
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/candidate/respond] POST", error);
    return NextResponse.json(
      { error: "אירעה שגיאה בעדכון התשובה. נא לנסות שוב או לפנות למנהל הגיוס." },
      { status: 500 }
    );
  }
}
