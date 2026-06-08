import { mondayConfig } from "@/lib/env";
import { mondayFetch } from "@/lib/monday/client";
import { JOB_BOARD_COLUMNS, MONDAY_COLUMNS } from "@/lib/monday/columns";
import type {
  ChangeMultipleColumnValuesData,
  MondayColumnValue,
} from "@/lib/monday/types";

type JobBoardColumnValue = MondayColumnValue & {
  type?: string | null;
};

type JobBoardItemQueryData = {
  boards: Array<{
    items_page: {
      items: Array<{
        id: string;
        name: string;
        column_values: JobBoardColumnValue[];
      }>;
    };
  }>;
};

export type JobBoardCandidateContact = {
  jobBoardId: string;
  jobBoardItemId: string;
  name: string;
  email: string;
  phone: string;
};

function readEmailFromColumn(column: JobBoardColumnValue): string {
  if (column.text?.trim()) {
    return column.text.trim();
  }

  if (column.value) {
    try {
      const parsed = JSON.parse(column.value) as {
        email?: string;
        text?: string;
      };
      const email = parsed.email?.trim() || parsed.text?.trim();
      if (email) {
        return email;
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return "";
}

function readPhoneFromColumn(column: JobBoardColumnValue): string {
  if (column.text?.trim()) {
    return column.text.trim();
  }

  if (column.value) {
    try {
      const parsed = JSON.parse(column.value) as { phone?: string };
      if (parsed.phone?.trim()) {
        return parsed.phone.trim();
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return "";
}

function parseEmailFromJobBoardColumns(
  columnValues: JobBoardColumnValue[]
): string {
  for (const column of columnValues) {
    if (column.type !== "email") {
      continue;
    }
    const email = readEmailFromColumn(column);
    if (email) {
      return email;
    }
  }
  return "";
}

function parsePhoneFromJobBoardColumns(
  columnValues: JobBoardColumnValue[]
): string {
  for (const column of columnValues) {
    if (column.type !== "phone") {
      continue;
    }
    const phone = readPhoneFromColumn(column);
    if (phone) {
      return phone;
    }
  }
  return "";
}

/** Loads name, email, and phone from a template Job Board item. */
export async function fetchJobBoardCandidateContact({
  boardId,
  itemId,
}: {
  boardId: string;
  itemId: string;
}): Promise<JobBoardCandidateContact> {
  const data = await mondayFetch<JobBoardItemQueryData>({
    query: `
      query FetchJobBoardCandidate($boardId: [ID!]!, $itemIds: [ID!]!) {
        boards(ids: $boardId) {
          items_page(query_params: { ids: $itemIds }) {
            items {
              id
              name
              column_values {
                id
                text
                type
                value
              }
            }
          }
        }
      }
    `,
    variables: {
      boardId: [boardId],
      itemIds: [itemId],
    },
  });

  const item = data.boards[0]?.items_page.items[0];
  if (!item) {
    throw new Error(
      `Job Board item ${itemId} not found on board ${boardId}`
    );
  }

  return {
    jobBoardId: boardId,
    jobBoardItemId: itemId,
    name: item.name.trim(),
    email: parseEmailFromJobBoardColumns(item.column_values),
    phone: parsePhoneFromJobBoardColumns(item.column_values),
  };
}

/** Creates a new candidate item on the Central Exam Board with contact fields only. */
export async function createExamBoardCandidateItem(contact: {
  name: string;
  email: string;
  phone?: string;
}): Promise<string> {
  const name = contact.name.trim();
  const email = contact.email.trim();

  const columnValues: Record<string, unknown> = {
    [MONDAY_COLUMNS.email]: {
      email,
      text: email,
    },
  };

  const phone = contact.phone?.trim();
  if (phone) {
    columnValues[MONDAY_COLUMNS.phone] = {
      phone,
      countryShortName: "IL",
    };
  }

  const { create_item: createdItem } = await mondayFetch<{
    create_item: { id: string };
  }>({
    query: `
      mutation CreateExamBoardCandidate(
        $boardId: ID!
        $itemName: String!
        $columnValues: JSON!
      ) {
        create_item(
          board_id: $boardId
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
      itemName: name,
      columnValues: JSON.stringify(columnValues),
    },
  });

  return createdItem.id;
}

/** Links a Job Board item to its newly created Central Exam Board item. */
export async function linkJobBoardItemToExamBoardItem({
  jobBoardId,
  jobBoardItemId,
  examBoardItemId,
}: {
  jobBoardId: string;
  jobBoardItemId: string;
  examBoardItemId: string;
}): Promise<void> {
  const columnValues = JSON.stringify({
    [JOB_BOARD_COLUMNS.examBoardLink]: {
      linkedPulseIds: [{ linkedPulseId: Number(examBoardItemId) }],
    },
  });

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation LinkJobBoardToExamBoard(
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
      boardId: jobBoardId,
      itemId: jobBoardItemId,
      columnValues,
    },
  });
}
