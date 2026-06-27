import { examTypeIdFromMondayLabel } from "@/lib/exam/exam-types";
import { mondayConfig } from "@/lib/env";
import {
  CONFIRM_STATUS,
  EXAM_STATUS,
  MONDAY_COLUMNS,
  MONDAY_PLACEHOLDER_SCHEDULED_DATE,
} from "./columns";
import { mondayFetch } from "./client";
import {
  jerusalemWallClockToInstant,
} from "./datetime";
import type {
  ChangeMultipleColumnValuesData,
  MondayColumnValue,
  ScheduledCandidateRow,
} from "./types";
import { parseColumnText } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SCHEDULED_COLUMN_IDS = [
  MONDAY_COLUMNS.email,
  MONDAY_COLUMNS.examType,
  MONDAY_COLUMNS.magicLinkToken,
  MONDAY_COLUMNS.examStatus,
  MONDAY_COLUMNS.statusConfirm,
  MONDAY_COLUMNS.scheduledAt,
] as const;

type ScheduledBoardItem = {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
};

type ItemByIdData = {
  items: ScheduledBoardItem[];
};

/** Monday date column value written on create before the real exam time is set. */
export function placeholderScheduledColumnValue(): { date: string; time: string } {
  return {
    date: MONDAY_PLACEHOLDER_SCHEDULED_DATE.date,
    time: MONDAY_PLACEHOLDER_SCHEDULED_DATE.time,
  };
}

const JERUSALEM_TZ = "Asia/Jerusalem";

function scheduledTimeHmFromColumn(time: string): string {
  const match = time.trim().match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "00:00";
}

/**
 * Interprets Monday scheduledAt date/time components as Asia/Jerusalem local time
 * and returns the corresponding UTC instant.
 */
function scheduledInstantFromJerusalemWallClock(
  dateKey: string,
  time: string
): Date {
  const timeHm = scheduledTimeHmFromColumn(time);
  const instant = jerusalemWallClockToInstant(dateKey, timeHm);

  // #region agent log
  fetch("http://127.0.0.1:7488/ingest/5e9b5d4c-503c-4b19-9abd-9ba9afdbe29a", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "0f3fda",
    },
    body: JSON.stringify({
      sessionId: "0f3fda",
      location: "scheduled.ts:scheduledInstantFromJerusalemWallClock",
      message: "Jerusalem wall-clock → UTC instant",
      data: {
        dateKey,
        time,
        timeHm,
        jerusalemTz: JERUSALEM_TZ,
        utcInstant: instant.toISOString(),
      },
      timestamp: Date.now(),
      hypothesisId: "H1-timezone",
    }),
  }).catch(() => {});
  // #endregion

  return instant;
}

export function parseMondayDateColumnValue(
  value: string | null | undefined
): { date: string; time: string } | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as { date?: string; time?: string };
    if (!parsed.date?.trim()) {
      return null;
    }

    const timeRaw = parsed.time?.trim() || "00:00:00";
    const timeMatch = timeRaw.match(/^(\d{2}):(\d{2})/);
    const time = timeMatch
      ? `${timeMatch[1]}:${timeMatch[2]}:00`
      : "00:00:00";

    return { date: parsed.date.trim(), time };
  } catch {
    return null;
  }
}

function rowFromItem(item: ScheduledBoardItem): ScheduledCandidateRow | null {
  const scheduledParsed = parseMondayDateColumnValue(
    item.column_values.find((c) => c.id === MONDAY_COLUMNS.scheduledAt)?.value
  );

  if (!scheduledParsed) {
    return null;
  }

  return {
    itemId: item.id,
    name: item.name,
    email: parseColumnText(item.column_values, MONDAY_COLUMNS.email),
    examTypeLabel: parseColumnText(item.column_values, MONDAY_COLUMNS.examType),
    magicLinkToken: parseColumnText(
      item.column_values,
      MONDAY_COLUMNS.magicLinkToken
    ),
    scheduledDate: scheduledParsed.date,
    scheduledTime: scheduledParsed.time,
    examStatus: parseColumnText(item.column_values, MONDAY_COLUMNS.examStatus),
    statusConfirm: parseColumnText(
      item.column_values,
      MONDAY_COLUMNS.statusConfirm
    ),
  };
}

export async function getScheduledCandidateRow(
  itemId: string
): Promise<ScheduledCandidateRow | null> {
  const data = await mondayFetch<ItemByIdData>({
    query: `
      query GetScheduledCandidateRow($itemIds: [ID!]!) {
        items(ids: $itemIds) {
          id
          name
          column_values(ids: [${SCHEDULED_COLUMN_IDS.map((id) => `"${id}"`).join(", ")}]) {
            id
            text
            value
          }
        }
      }
    `,
    variables: { itemIds: [itemId] },
  });

  const item = data.items[0];
  if (!item) {
    return null;
  }

  return rowFromItem(item);
}

/** Interprets Monday scheduledAt date/time as Asia/Jerusalem local wall-clock. */
export function scheduledInstantFromRow(
  row: Pick<ScheduledCandidateRow, "scheduledDate" | "scheduledTime">
): Date | null {
  if (row.scheduledDate === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date) {
    return null;
  }

  return scheduledInstantFromJerusalemWallClock(
    row.scheduledDate,
    row.scheduledTime
  );
}

/**
 * Parses a raw Monday `date_mm3y4hj6` column value (JSON) into an exam instant.
 * Date and time components are treated as Asia/Jerusalem local time (IDT/IST).
 */
export function scheduledInstantFromMondayColumnValue(
  rawValue: string | null | undefined
): Date | null {
  const parsed = parseMondayDateColumnValue(rawValue);
  if (!parsed) {
    return null;
  }

  if (parsed.date === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date) {
    return null;
  }

  return scheduledInstantFromJerusalemWallClock(parsed.date, parsed.time);
}

export type ExamInviteIneligibilityReason =
  | "placeholder_date"
  | "not_approved"
  | "exam_already_started"
  | "missing_email_or_token"
  | "invalid_exam_type";

export function examInviteIneligibilityReason(
  row: ScheduledCandidateRow
): ExamInviteIneligibilityReason | null {
  if (row.scheduledDate === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date) {
    return "placeholder_date";
  }

  if (row.statusConfirm !== CONFIRM_STATUS.APPROVED) {
    return "not_approved";
  }

  if (row.examStatus !== EXAM_STATUS.NOT_STARTED) {
    return "exam_already_started";
  }

  if (!row.magicLinkToken.trim() || !EMAIL_RE.test(row.email)) {
    return "missing_email_or_token";
  }

  if (!examTypeIdFromMondayLabel(row.examTypeLabel)) {
    return "invalid_exam_type";
  }

  return null;
}

export function isEligibleForExamInvite(row: ScheduledCandidateRow): boolean {
  return examInviteIneligibilityReason(row) === null;
}

/** Sets examStatus to SuperMail trigger label (color_mm3xcqrz). */
export async function triggerSuperMailExamDispatch(itemId: string): Promise<void> {
  const columnValues = JSON.stringify({
    [MONDAY_COLUMNS.examStatus]: { label: EXAM_STATUS.SEND_EXAM_NOW },
  });

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation TriggerSuperMailExamDispatch(
        $boardId: ID!
        $itemId: ID!
        $columnValues: JSON!
      ) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
          create_labels_if_missing: true
        ) {
          id
        }
      }
    `,
    variables: {
      boardId: mondayConfig.boardId,
      itemId,
      columnValues,
    },
  });
}
