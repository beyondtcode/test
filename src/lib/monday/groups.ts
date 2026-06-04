import { mondayConfig } from "@/lib/env";
import {
  EXAM_STATUS,
  MONDAY_COLUMNS,
  MONDAY_TEAM_EMAIL,
} from "./columns";
import { mondayFetch } from "./client";
import type { ParsedCandidateRow } from "@/lib/excel/parse-candidate-sheet";

export function groupNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/i, "").trim();
  const sanitized = base
    .replace(/[^\w\u0590-\u05FF-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return sanitized || "Import_Batch";
}

export async function createMondayGroup(groupName: string): Promise<string> {
  const { create_group: group } = await mondayFetch<{
    create_group: { id: string };
  }>({
    query: `
      mutation CreateGroup($boardId: ID!, $groupName: String!) {
        create_group(board_id: $boardId, group_name: $groupName) {
          id
        }
      }
    `,
    variables: {
      boardId: mondayConfig.boardId,
      groupName,
    },
  });

  return group.id;
}

export function buildImportColumnValues(
  row: Pick<ParsedCandidateRow, "email" | "phone" | "seminary" | "examName">,
  token: string
): Record<string, unknown> {
  const values: Record<string, unknown> = {
    [MONDAY_COLUMNS.email]: {
      email: row.email,
      text: row.email,
    },
    [MONDAY_COLUMNS.teamEmail]: {
      email: MONDAY_TEAM_EMAIL,
      text: MONDAY_TEAM_EMAIL,
    },
    [MONDAY_COLUMNS.examType]: {
      label: row.examName.trim(),
    },
    [MONDAY_COLUMNS.magicLinkToken]: token,
    [MONDAY_COLUMNS.examStatus]: { label: EXAM_STATUS.NOT_STARTED },
  };

  const phone = row.phone.trim();
  if (phone) {
    values[MONDAY_COLUMNS.phone] = {
      phone,
      countryShortName: "IL",
    };
  }

  const seminary = row.seminary.trim();
  if (seminary) {
    values[MONDAY_COLUMNS.seminary] = seminary;
  }

  return values;
}

export async function createCandidateItemInGroup({
  groupId,
  name,
  columnValues,
}: {
  groupId: string;
  name: string;
  columnValues: Record<string, unknown>;
}): Promise<string> {
  const { create_item: createdItem } = await mondayFetch<{
    create_item: { id: string };
  }>({
    query: `
      mutation CreateCandidateInGroup(
        $boardId: ID!
        $groupId: String!
        $itemName: String!
        $columnValues: JSON!
      ) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $itemName
          column_values: $columnValues
          create_labels_if_missing: true
        ) {
          id
        }
      }
    `,
    variables: {
      boardId: mondayConfig.boardId,
      groupId,
      itemName: name,
      columnValues: JSON.stringify(columnValues),
    },
  });

  return createdItem.id;
}
