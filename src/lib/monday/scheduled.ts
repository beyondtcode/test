import { examTypeIdFromMondayLabel } from "@/lib/exam/exam-types";
import { mondayConfig } from "@/lib/env";
import {
  CONFIRM_STATUS,
  EXAM_STATUS,
  MONDAY_COLUMNS,
  MONDAY_PLACEHOLDER_SCHEDULED_DATE,
} from "./columns";
import { mondayFetch } from "./client";
import type {
  ChangeMultipleColumnValuesData,
  MondayColumnValue,
  ScheduledCandidateRow,
} from "./types";
import { parseColumnText } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CRON_COLUMN_IDS = [
  MONDAY_COLUMNS.email,
  MONDAY_COLUMNS.examType,
  MONDAY_COLUMNS.magicLinkToken,
  MONDAY_COLUMNS.examStatus,
  MONDAY_COLUMNS.statusConfirm,
  MONDAY_COLUMNS.scheduledAt,
] as const;

type CronBoardItem = {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
};

type BoardItemsPageData = {
  boards: Array<{
    items_page: {
      cursor: string | null;
      items: CronBoardItem[];
    };
  }>;
};

export type IsraelScheduleMinute = {
  date: string;
  time: string;
};

export function getIsraelScheduleMinute(now = new Date()): IsraelScheduleMinute {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:00`,
  };
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

function scheduledMinuteMatches(
  scheduled: { date: string; time: string },
  israelNow: IsraelScheduleMinute
): boolean {
  const scheduledHm = scheduled.time.slice(0, 5);
  const nowHm = israelNow.time.slice(0, 5);
  return scheduled.date === israelNow.date && scheduledHm === nowHm;
}

function rowFromItem(item: CronBoardItem): ScheduledCandidateRow | null {
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

export async function listBoardItemsForCron(): Promise<ScheduledCandidateRow[]> {
  const rows: ScheduledCandidateRow[] = [];
  let cursor: string | null = null;

  do {
    const data: BoardItemsPageData = await mondayFetch<BoardItemsPageData>({
      query: `
        query ListBoardItemsForCron($boardId: [ID!]!, $cursor: String) {
          boards(ids: $boardId) {
            items_page(limit: 100, cursor: $cursor) {
              cursor
              items {
                id
                name
                column_values(ids: [${CRON_COLUMN_IDS.map((id) => `"${id}"`).join(", ")}]) {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `,
      variables: {
        boardId: [mondayConfig.boardId],
        cursor,
      },
    });

    const page = data.boards[0]?.items_page;
    if (!page) {
      break;
    }

    for (const item of page.items) {
      const row = rowFromItem(item);
      if (row) {
        rows.push(row);
      }
    }

    cursor = page.cursor;
  } while (cursor);

  return rows;
}

export function isDueForExamInvite(
  row: ScheduledCandidateRow,
  israelNow: IsraelScheduleMinute
): boolean {
  if (row.scheduledDate === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date) {
    return false;
  }

  if (row.statusConfirm !== CONFIRM_STATUS.APPROVED) {
    return false;
  }

  if (row.examStatus !== EXAM_STATUS.NOT_STARTED) {
    return false;
  }

  if (!row.magicLinkToken.trim() || !EMAIL_RE.test(row.email)) {
    return false;
  }

  if (!examTypeIdFromMondayLabel(row.examTypeLabel)) {
    return false;
  }

  return scheduledMinuteMatches(
    { date: row.scheduledDate, time: row.scheduledTime },
    israelNow
  );
}

export function filterDueCandidates(
  rows: ScheduledCandidateRow[],
  israelNow: IsraelScheduleMinute
): ScheduledCandidateRow[] {
  return rows.filter((row) => isDueForExamInvite(row, israelNow));
}

export async function markExamInviteSent(itemId: string): Promise<void> {
  const columnValues = JSON.stringify({
    [MONDAY_COLUMNS.examStatus]: { label: EXAM_STATUS.INVITE_SENT },
  });

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation MarkExamInviteSent(
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
