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
  EXAM_STATUS,
  isCandidateTrack,
  MONDAY_COLUMNS,
  MONDAY_TEAM_EMAIL,
  type CandidateTrack,
} from "@/lib/monday";
import { formatMondayJerusalemWallClock } from "@/lib/monday/datetime";
import {
  createCandidateItemInGroup,
  getPrivateCandidatesGroupId,
} from "@/lib/monday/groups";
import { buildExamMagicLink, getRequestOrigin } from "@/lib/app-url";
import { scheduleExamInviteAlarmWithResult } from "@/lib/qstash/schedule-exam-invite";
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
    const { date, time } = formatMondayJerusalemWallClock(scheduledAt);

    const columnValues = {
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
    };

    const groupId = await getPrivateCandidatesGroupId();
    const createdItemId = await createCandidateItemInGroup({
      groupId,
      name,
      columnValues,
    });

    const examInviteSchedule = await scheduleExamInviteAlarmWithResult(
      createdItemId,
      scheduledAt
    );

    const link = buildExamMagicLink(token);

    return NextResponse.json({
      link,
      token,
      examInviteSchedule,
      ...(examInviteSchedule.status === "failed"
        ? {
            warning:
              "המועמדת נוצרה, אך תזמון שליחת המבחן נכשל. בדקו את הגדרות QStash בשרת.",
          }
        : {}),
    });
  } catch (error) {
    console.error("[api/admin/create-candidate]", error);
    return NextResponse.json(
      { error: "יצירת מועמדת חדשה נכשלה." },
      { status: 500 }
    );
  }
}
