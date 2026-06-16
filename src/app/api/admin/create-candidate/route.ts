import { NextResponse } from "next/server";
import { generateCandidateMagicToken } from "@/lib/candidate/token";
import { cookies } from "next/headers";
import { parseScheduledAt } from "@/lib/api/scheduled-at";
import { parseNonEmptyString } from "@/lib/api/validation";
import {
  EXAM_TYPE_LABELS,
  isExamTypeId,
  type ExamTypeId,
} from "@/lib/exam/exam-types";
import {
  mondayFetch,
  EXAM_STATUS,
  isCandidateTrack,
  MONDAY_COLUMNS,
  MONDAY_TEAM_EMAIL,
  type CandidateTrack,
} from "@/lib/monday";
import { formatMondayDateTime } from "@/lib/monday/datetime";
import { buildExamMagicLink, getRequestOrigin } from "@/lib/app-url";
import { mondayConfig } from "@/lib/env";
import { scheduleExamInviteAlarm } from "@/lib/qstash/schedule-exam-invite";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionCookieValue,
} from "@/lib/admin/session";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

    if (!verifyAdminSessionCookieValue(sessionValue)) {
      return NextResponse.json(
        { error: "אין לך הרשאה לבצע פעולה זו." },
        { status: 401 }
      );
    }

    const requestExpectedOrigin = getRequestOrigin(request);
    const requestOrigin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    if (requestOrigin && requestOrigin !== requestExpectedOrigin) {
      return NextResponse.json(
        { error: "בקשה לא מורשית." },
        { status: 403 }
      );
    }

    if (referer && !referer.startsWith(requestExpectedOrigin)) {
      return NextResponse.json(
        { error: "בקשה לא מורשית." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      name?: unknown;
      email?: unknown;
      examTypeId?: unknown;
      candidateSource?: unknown;
      candidateTrack?: unknown;
      scheduledAt?: unknown;
    };

    const name = parseNonEmptyString(body.name, "name");
    const email = parseNonEmptyString(body.email, "email");
    const examTypeRaw = parseNonEmptyString(body.examTypeId, "examTypeId");
    const candidateSource = parseNonEmptyString(
      body.candidateSource,
      "candidateSource"
    );
    const candidateTrackRaw = parseNonEmptyString(
      body.candidateTrack,
      "candidateTrack"
    );
    const scheduledAt = parseScheduledAt(body.scheduledAt);

    if (
      !name ||
      !email ||
      !examTypeRaw ||
      !candidateSource ||
      !candidateTrackRaw ||
      !scheduledAt
    ) {
      return NextResponse.json(
        {
          error:
            "יש להזין שם, אימייל, סוג מבחן, מקור מועמדת, מסלול נבחן ותאריך/שעה מתוכננים.",
        },
        { status: 400 }
      );
    }

    if (!isCandidateTrack(candidateTrackRaw)) {
      return NextResponse.json(
        { error: "מסלול הנבחן שנבחר אינו תקין." },
        { status: 400 }
      );
    }

    const candidateTrack = candidateTrackRaw as CandidateTrack;

    if (!isExamTypeId(examTypeRaw)) {
      return NextResponse.json(
        { error: "סוג המבחן שנבחר אינו תקין." },
        { status: 400 }
      );
    }

    const examTypeId = examTypeRaw as ExamTypeId;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "האימייל שהוזן אינו תקין." },
        { status: 400 }
      );
    }

    const token = generateCandidateMagicToken();
    const { date, time } = formatMondayDateTime(scheduledAt);

    const columnValues = JSON.stringify({
      [MONDAY_COLUMNS.email]: {
        email,
        text: email,
      },
      [MONDAY_COLUMNS.teamEmail]: {
        email: MONDAY_TEAM_EMAIL,
        text: MONDAY_TEAM_EMAIL,
      },
      [MONDAY_COLUMNS.examType]: {
        label: EXAM_TYPE_LABELS[examTypeId],
      },
      [MONDAY_COLUMNS.candidateSource]: candidateSource,
      [MONDAY_COLUMNS.scheduledAt]: { date, time },
      [MONDAY_COLUMNS.magicLinkToken]: token,
      [MONDAY_COLUMNS.examStatus]: { label: EXAM_STATUS.NOT_STARTED },
      [MONDAY_COLUMNS.candidateTrack]: { label: candidateTrack },
    });

    const query = `
      mutation CreateCandidate($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId
          item_name: $itemName
          column_values: $columnValues
          create_labels_if_missing: true
        ) {
          id
        }
      }
    `;

    const { create_item: createdItem } = await mondayFetch<{
      create_item: { id: string };
    }>({
      query,
      variables: {
        boardId: mondayConfig.boardId,
        itemName: name,
        columnValues,
      },
    });

    try {
      await scheduleExamInviteAlarm(createdItem.id, scheduledAt);
    } catch (scheduleError) {
      console.error(
        `[api/admin/create-candidate] QStash schedule failed for item ${createdItem.id}:`,
        scheduleError
      );
    }

    const link = buildExamMagicLink(token);

    return NextResponse.json({ link, token });
  } catch (error) {
    console.error("[api/admin/create-candidate]", error);
    return NextResponse.json(
      { error: "יצירת מועמדת חדשה נכשלה." },
      { status: 500 }
    );
  }
}
