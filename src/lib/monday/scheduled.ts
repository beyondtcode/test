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

/** Interprets Monday date/time columns as an instant in Asia/Jerusalem. */
export function scheduledInstantFromRow(
  row: Pick<ScheduledCandidateRow, "scheduledDate" | "scheduledTime">
): Date | null {
  if (row.scheduledDate === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date) {
    return null;
  }

  const timeHm = row.scheduledTime.slice(0, 5);
  const target = `${row.scheduledDate} ${timeHm}`;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  let instant = Date.parse(`${row.scheduledDate}T${timeHm}:00Z`);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value])
    ) as Record<string, string>;
    const shown = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
    if (shown === target) {
      return new Date(instant);
    }

    const [y, m, d] = row.scheduledDate.split("-").map(Number);
    const [hh, mm] = timeHm.split(":").map(Number);
    const shownDate = new Date(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    const targetDate = new Date(y, m - 1, d, hh, mm);
    instant += targetDate.getTime() - shownDate.getTime();
  }

  return new Date(instant);
}

export function isEligibleForExamInvite(row: ScheduledCandidateRow): boolean {
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

  return true;
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
