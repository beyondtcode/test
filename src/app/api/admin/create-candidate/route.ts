import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseNonEmptyString } from "@/lib/api/validation";
import {
  EXAM_TYPE_LABELS,
  isExamTypeId,
  type ExamTypeId,
} from "@/lib/exam/exam-types";
import {
  mondayFetch,
  EXAM_STATUS,
  MONDAY_COLUMNS,
  MONDAY_TEAM_EMAIL,
  updateCandidateScheduledAt,
} from "@/lib/monday";
import { mondayConfig } from "@/lib/env";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionCookieValue,
} from "@/lib/admin/session";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_FALLBACK_APP_URL = "http://localhost:3000";

function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const url = new URL(request.url);
  const proto = forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = forwardedHost?.split(",")[0]?.trim() || url.host;

  return `${proto}://${host}`;
}

function getAppBaseUrl(): string {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || LOCAL_FALLBACK_APP_URL;
  return rawBaseUrl.replace(/\/+$/, "");
}

function formatMondayDateTime(date: Date): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return { date: dateStr, time: timeStr };
}

function parseScheduledAt(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

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
      scheduledAt?: unknown;
    };

    const name = parseNonEmptyString(body.name, "name");
    const email = parseNonEmptyString(body.email, "email");
    const examTypeRaw = parseNonEmptyString(body.examTypeId, "examTypeId");
    const candidateSource = parseNonEmptyString(
      body.candidateSource,
      "candidateSource"
    );
    const scheduledAt = parseScheduledAt(body.scheduledAt);

    if (!name || !email || !examTypeRaw || !candidateSource || !scheduledAt) {
      return NextResponse.json(
        {
          error:
            "יש להזין שם, אימייל, סוג מבחן, מקור מועמדת ותאריך/שעה מתוכננים.",
        },
        { status: 400 }
      );
    }

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

    const token =
      crypto.randomUUID() + "-" + crypto.randomBytes(16).toString("hex");

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

    // Monday send-test-details automation can clear the date column; restore admin input.
    await updateCandidateScheduledAt(createdItem.id, scheduledAt);

    const baseUrl = getAppBaseUrl();
    const link = `${baseUrl}/test?token=${encodeURIComponent(token)}`;

    return NextResponse.json({ link, token });
  } catch (error) {
    console.error("[api/admin/create-candidate]", error);
    return NextResponse.json(
      { error: "יצירת מועמדת חדשה נכשלה." },
      { status: 500 }
    );
  }
}
