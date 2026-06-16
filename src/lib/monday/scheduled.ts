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
  formatMondayDateTime,
  instantFromMondayDateColumn,
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
  return formatMondayDateTime(
    instantFromMondayDateColumn(
      MONDAY_PLACEHOLDER_SCHEDULED_DATE.date,
      MONDAY_PLACEHOLDER_SCHEDULED_DATE.time
    )
  );
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

/** Interprets Monday date/time column values (UTC storage) as an instant. */
export function scheduledInstantFromRow(
  row: Pick<ScheduledCandidateRow, "scheduledDate" | "scheduledTime">
): Date | null {
  if (row.scheduledDate === MONDAY_PLACEHOLDER_SCHEDULED_DATE.date) {
    return null;
  }

  return instantFromMondayDateColumn(row.scheduledDate, row.scheduledTime);
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
