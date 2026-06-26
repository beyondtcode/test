import { mondayConfig } from "@/lib/env";
import { updateCandidateScheduledAt } from "./client";
import { normalizeMondayPhone } from "./phone";
import {
  EXAM_STATUS,
  MONDAY_COLUMNS,
  MONDAY_TEAM_EMAIL,
  type CandidateTrack,
} from "./columns";
import { mondayFetch } from "./client";
import { scheduleExamInviteAlarmWithResult } from "@/lib/qstash/schedule-exam-invite";
import type { ParsedCandidateRow } from "@/lib/excel/parse-candidate-sheet";

export const PRIVATE_CANDIDATES_GROUP_TITLE = "מועמדים פרטיים";

export type MondayGroupSummary = {
  id: string;
  title: string;
  itemCount: number;
};

export type MondayGroupItem = {
  id: string;
  name: string;
};

type BoardGroupsQueryData = {
  boards: Array<{
    groups: Array<{
      id: string;
      title: string;
      items_page: {
        cursor: string | null;
        items: Array<{ id: string }>;
      };
    }>;
  }>;
};

type GroupItemsQueryData = {
  boards: Array<{
    groups: Array<{
      items_page: {
        cursor: string | null;
        items: Array<{ id: string; name: string }>;
      };
    }>;
  }>;
};

type BoardGroupTitlesQueryData = {
  boards: Array<{
    groups: Array<{
      id: string;
      title: string;
    }>;
  }>;
};

export function groupNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/i, "").trim();
  const sanitized = base
    .replace(/[^\w\u0590-\u05FF-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return sanitized || "Import_Batch";
}

export async function getGroupIdByTitle(title: string): Promise<string> {
  const data = await mondayFetch<BoardGroupTitlesQueryData>({
    query: `
      query ListBoardGroupTitles($boardId: [ID!]) {
        boards(ids: $boardId) {
          groups {
            id
            title
          }
        }
      }
    `,
    variables: {
      boardId: [mondayConfig.boardId],
    },
  });

  const normalizedTitle = title.trim();
  const match = data.boards[0]?.groups.find(
    (group) => group.title.trim() === normalizedTitle
  );

  if (!match) {
    throw new Error(`Monday group not found: ${title}`);
  }

  return match.id;
}

export async function getPrivateCandidatesGroupId(): Promise<string> {
  return getGroupIdByTitle(PRIVATE_CANDIDATES_GROUP_TITLE);
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
  row: Pick<
    ParsedCandidateRow,
    "email" | "phone" | "seminary" | "notes" | "examName"
  >,
  token: string,
  candidateTrack: CandidateTrack
): Record<string, unknown> {
  const values: Record<string, unknown> = {
    [MONDAY_COLUMNS.teamEmail]: {
      email: MONDAY_TEAM_EMAIL,
      text: MONDAY_TEAM_EMAIL,
    },
    [MONDAY_COLUMNS.magicLinkToken]: token,
    [MONDAY_COLUMNS.examStatus]: { label: EXAM_STATUS.NOT_STARTED },
    [MONDAY_COLUMNS.candidateTrack]: { label: candidateTrack },
  };

  const examName = row.examName.trim();
  if (examName) {
    values[MONDAY_COLUMNS.examType] = {
      label: examName,
    };
  }

  const email = row.email.trim();
  if (email) {
    values[MONDAY_COLUMNS.email] = {
      email,
      text: email,
    };
  }

  const phone = normalizeMondayPhone(row.phone);
  if (phone) {
    values[MONDAY_COLUMNS.phone] = {
      phone,
      countryShortName: "IL",
    };
  }

  const seminary = row.seminary.trim();
  if (seminary) {
    values[MONDAY_COLUMNS.candidateSource] = seminary;
  }

  const notes = row.notes.trim();
  if (notes) {
    values[MONDAY_COLUMNS.notes] = notes;
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

const GROUP_ITEMS_PAGE_LIMIT = 500;

export async function listBoardGroups(): Promise<MondayGroupSummary[]> {
  const data = await mondayFetch<BoardGroupsQueryData>({
    query: `
      query ListBoardGroups($boardId: [ID!]) {
        boards(ids: $boardId) {
          groups {
            id
            title
            items_page(limit: ${GROUP_ITEMS_PAGE_LIMIT}) {
              cursor
              items {
                id
              }
            }
          }
        }
      }
    `,
    variables: {
      boardId: [mondayConfig.boardId],
    },
  });

  const board = data.boards[0];
  if (!board) {
    return [];
  }

  return board.groups
    .map((group) => ({
      id: group.id,
      title: group.title,
      itemCount: group.items_page.items.length,
    }))
    .filter((group) => group.itemCount > 0);
}

export async function listGroupItems(groupId: string): Promise<MondayGroupItem[]> {
  const items: MondayGroupItem[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const data: GroupItemsQueryData = await mondayFetch<GroupItemsQueryData>({
      query: `
        query ListGroupItems($boardId: [ID!], $groupId: String!, $cursor: String) {
          boards(ids: $boardId) {
            groups(ids: [$groupId]) {
              items_page(limit: ${GROUP_ITEMS_PAGE_LIMIT}, cursor: $cursor) {
                cursor
                items {
                  id
                  name
                }
              }
            }
          }
        }
      `,
      variables: {
        boardId: [mondayConfig.boardId],
        groupId,
        cursor,
      },
    });

    const group = data.boards[0]?.groups[0];
    if (!group) {
      break;
    }

    items.push(...group.items_page.items);
    cursor = group.items_page.cursor;
    hasMore = Boolean(cursor);
  }

  return items;
}

export type ScheduleGroupResult = {
  updated: number;
  failed: Array<{ itemId: string; name?: string; message: string }>;
  qstashFailed: Array<{ itemId: string; name?: string; message: string }>;
};

export async function scheduleExamDateForGroup(
  groupId: string,
  scheduledAt: Date
): Promise<ScheduleGroupResult> {
  const items = await listGroupItems(groupId);
  const failed: ScheduleGroupResult["failed"] = [];
  const qstashFailed: ScheduleGroupResult["qstashFailed"] = [];
  let updated = 0;

  for (const item of items) {
    try {
      await updateCandidateScheduledAt(item.id, scheduledAt);
      const scheduleResult = await scheduleExamInviteAlarmWithResult(
        item.id,
        scheduledAt
      );
      if (scheduleResult.status === "failed") {
        qstashFailed.push({
          itemId: item.id,
          name: item.name,
          message: scheduleResult.error,
        });
      }
      updated += 1;
    } catch (error) {
      failed.push({
        itemId: item.id,
        name: item.name,
        message:
          error instanceof Error
            ? error.message
            : "עדכון תאריך המבחן נכשל.",
      });
    }
  }

  return { updated, failed, qstashFailed };
}
