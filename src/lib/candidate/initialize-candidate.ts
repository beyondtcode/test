import { generateCandidateMagicToken } from "@/lib/candidate/token";
import { mondayConfig } from "@/lib/env";
import { mondayFetch } from "@/lib/monday/client";
import {
  EXAM_STATUS,
  MONDAY_COLUMNS,
  MONDAY_TEAM_EMAIL,
} from "@/lib/monday/columns";
import {
  getScheduledCandidateRow,
  scheduledInstantFromRow,
} from "@/lib/monday/scheduled";
import type {
  ChangeMultipleColumnValuesData,
  MondayColumnValue,
} from "@/lib/monday/types";
import { parseColumnText } from "@/lib/monday/types";
import { scheduleExamInviteAlarm } from "@/lib/qstash/schedule-exam-invite";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTACT_COLUMN_IDS = [
  MONDAY_COLUMNS.email,
  MONDAY_COLUMNS.phone,
  MONDAY_COLUMNS.magicLinkToken,
] as const;

export type InitializeCandidateInput = {
  itemId: string;
  name?: string;
  email?: string;
  phone?: string;
};

export type InitializeCandidateResult = {
  itemId: string;
  token: string;
  scheduled: boolean;
  alreadyInitialized: boolean;
};

type ItemContactQueryData = {
  items: Array<{
    id: string;
    name: string;
    column_values: MondayColumnValue[];
  }>;
};

export type CandidateContactFields = {
  name: string;
  email: string;
  phone: string;
  existingToken: string;
};

export async function fetchCandidateContactFields(
  itemId: string
): Promise<CandidateContactFields> {
  const data = await mondayFetch<ItemContactQueryData>({
    query: `
      query FetchItemContactFields($itemIds: [ID!]!) {
        items(ids: $itemIds) {
          id
          name
          column_values(ids: [${CONTACT_COLUMN_IDS.map((id) => `"${id}"`).join(", ")}]) {
            id
            text
          }
        }
      }
    `,
    variables: { itemIds: [itemId] },
  });

  const item = data.items[0];
  if (!item) {
    throw new Error(`Monday item ${itemId} not found`);
  }

  return {
    name: item.name,
    email: parseColumnText(item.column_values, MONDAY_COLUMNS.email),
    phone: parseColumnText(item.column_values, MONDAY_COLUMNS.phone),
    existingToken: parseColumnText(
      item.column_values,
      MONDAY_COLUMNS.magicLinkToken
    ),
  };
}

/**
 * Initializes an existing Monday candidate item: magic token, "Not Started"
 * status, and QStash exam-invite alarm when a scheduled date is present.
 * Used by the Monday webhook and mirrors post-create steps from manual import.
 */
export async function initializeCandidateItem(
  input: InitializeCandidateInput
): Promise<InitializeCandidateResult> {
  const itemId = input.itemId.trim();
  const fromMonday = await fetchCandidateContactFields(itemId);

  if (fromMonday.existingToken.trim()) {
    return {
      itemId,
      token: fromMonday.existingToken.trim(),
      scheduled: false,
      alreadyInitialized: true,
    };
  }

  const email = (input.email?.trim() || fromMonday.email).trim();
  const phone = (input.phone?.trim() || fromMonday.phone).trim();

  if (!email || !EMAIL_RE.test(email)) {
    throw new Error(`Candidate ${itemId} is missing a valid email address`);
  }

  const token = generateCandidateMagicToken();

  const columnValues: Record<string, unknown> = {
    [MONDAY_COLUMNS.email]: {
      email,
      text: email,
    },
    [MONDAY_COLUMNS.teamEmail]: {
      email: MONDAY_TEAM_EMAIL,
      text: MONDAY_TEAM_EMAIL,
    },
    [MONDAY_COLUMNS.magicLinkToken]: token,
    [MONDAY_COLUMNS.examStatus]: { label: EXAM_STATUS.NOT_STARTED },
  };

  if (phone) {
    columnValues[MONDAY_COLUMNS.phone] = {
      phone,
      countryShortName: "IL",
    };
  }

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation InitializeCandidateItem(
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
      columnValues: JSON.stringify(columnValues),
    },
  });

  let scheduled = false;
  try {
    const row = await getScheduledCandidateRow(itemId);
    const scheduledAt = row ? scheduledInstantFromRow(row) : null;
    if (scheduledAt) {
      await scheduleExamInviteAlarm(itemId, scheduledAt);
      scheduled = true;
    }
  } catch (scheduleError) {
    console.error(
      `[initializeCandidateItem] QStash schedule failed for item ${itemId}:`,
      scheduleError
    );
  }

  return {
    itemId,
    token,
    scheduled,
    alreadyInitialized: false,
  };
}
