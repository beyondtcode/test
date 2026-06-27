import { examTypeIdFromMondayLabel } from "@/lib/exam/exam-types";
import { mondayConfig } from "@/lib/env";
import {
  CONFIRM_STATUS,
  EXAM_STATUS,
  MONDAY_COLUMNS,
  passResultLabelFromSubmission,
} from "./columns";
import { formatMondayDateTime, formatMondayJerusalemWallClock } from "./datetime";
import type { ConfirmStatus } from "./columns";
import type {
  CandidateRecord,
  ChangeMultipleColumnValuesData,
  ItemsPageByColumnValuesData,
} from "./types";
import { parseColumnText } from "./types";

const CANDIDATE_FETCH_COLUMN_IDS = [
  MONDAY_COLUMNS.email,
  MONDAY_COLUMNS.examType,
  MONDAY_COLUMNS.candidateSource,
  MONDAY_COLUMNS.examStatus,
  MONDAY_COLUMNS.jobPosition,
] as const;

const MONDAY_API_URL = "https://api.monday.com/v2";

type MondayFetchOptions = {
  query: string;
  variables?: Record<string, unknown>;
};

/**
 * Minimal Monday.com GraphQL client (server-side only).
 */
export async function mondayFetch<T>({
  query,
  variables,
}: MondayFetchOptions): Promise<T> {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: mondayConfig.apiKey,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Monday API error: ${response.status} ${response.statusText}`
    );
  }

  const json = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  if (!json.data) {
    throw new Error("Monday API returned no data");
  }

  return json.data;
}

const GET_CANDIDATE_BY_TOKEN = `
  query GetCandidateByToken($boardId: ID!, $token: String!) {
    items_page_by_column_values(
      board_id: $boardId
      limit: 1
      columns: [
        {
          column_id: "${MONDAY_COLUMNS.magicLinkToken}"
          column_values: [$token]
        }
      ]
    ) {
      items {
        id
        name
        column_values(ids: ["${CANDIDATE_FETCH_COLUMN_IDS.join('", "')}"]) {
          id
          text
        }
      }
    }
  }
`;

const GET_CANDIDATE_ITEM_ID_BY_TOKEN = `
  query GetCandidateItemIdByToken($boardId: ID!, $token: String!) {
    items_page_by_column_values(
      board_id: $boardId
      limit: 1
      columns: [
        {
          column_id: "${MONDAY_COLUMNS.magicLinkToken}"
          column_values: [$token]
        }
      ]
    ) {
      items {
        id
      }
    }
  }
`;

type CandidateItemIdByTokenData = {
  items_page_by_column_values: {
    items: Array<{ id: string }>;
  };
};

/** Token lookup for respond flow — does not require a valid exam type label. */
export async function getCandidateItemIdByToken(
  token: string
): Promise<string | null> {
  const data = await mondayFetch<CandidateItemIdByTokenData>({
    query: GET_CANDIDATE_ITEM_ID_BY_TOKEN,
    variables: {
      boardId: mondayConfig.boardId,
      token,
    },
  });

  return data.items_page_by_column_values.items[0]?.id ?? null;
}

export async function getCandidateByToken(
  token: string
): Promise<CandidateRecord | null> {
  const data = await mondayFetch<ItemsPageByColumnValuesData>({
    query: GET_CANDIDATE_BY_TOKEN,
    variables: {
      boardId: mondayConfig.boardId,
      token,
    },
  });

  const item = data.items_page_by_column_values.items[0];
  if (!item) {
    return null;
  }

  const email = parseColumnText(item.column_values, MONDAY_COLUMNS.email);
  const jobPosition = parseColumnText(
    item.column_values,
    MONDAY_COLUMNS.jobPosition
  );
  const examTypeLabel = parseColumnText(
    item.column_values,
    MONDAY_COLUMNS.examType
  );
  const examTypeId = examTypeIdFromMondayLabel(examTypeLabel);
  if (!examTypeId) {
    return null;
  }

  const candidateSource = parseColumnText(
    item.column_values,
    MONDAY_COLUMNS.candidateSource
  );
  const statusText = parseColumnText(
    item.column_values,
    MONDAY_COLUMNS.examStatus
  );

  const statusValues = Object.values(EXAM_STATUS) as string[];
  const status = statusValues.includes(statusText)
    ? (statusText as CandidateRecord["status"])
    : EXAM_STATUS.NOT_STARTED;

  return {
    itemId: item.id,
    name: item.name,
    email,
    jobPosition,
    examTypeId,
    examTypeLabel,
    candidateSource,
    status,
  };
}

export async function startCandidateExam(itemId: string): Promise<void> {
  const { date, time } = formatMondayDateTime(new Date());
  const columnValues = JSON.stringify({
    [MONDAY_COLUMNS.examStatus]: { label: EXAM_STATUS.IN_PROGRESS },
    [MONDAY_COLUMNS.startTime]: { date, time },
  });

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation StartCandidateExam(
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

export async function submitCandidateExam(
  itemId: string,
  score: number,
  tabLeaves: number,
  status: string
): Promise<void> {
  const columnValues = JSON.stringify({
    [MONDAY_COLUMNS.grade]: score,
    [MONDAY_COLUMNS.tabLeaves]: tabLeaves,
    [MONDAY_COLUMNS.examStatus]: { label: status },
    [MONDAY_COLUMNS.passResult]: {
      label: passResultLabelFromSubmission(score, status),
    },
  });

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation SubmitCandidateExam(
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

export async function verifyCandidateToken(
  token: string,
  itemId: string
): Promise<CandidateRecord | null> {
  const candidate = await getCandidateByToken(token);
  if (!candidate || candidate.itemId !== itemId) {
    return null;
  }
  return candidate;
}

async function changeCandidateScheduledAtColumn(
  itemId: string,
  scheduledAt: Date
): Promise<void> {
  const { date, time } = formatMondayJerusalemWallClock(scheduledAt);
  const columnValues = JSON.stringify({
    [MONDAY_COLUMNS.scheduledAt]: { date, time },
  });

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation ChangeCandidateScheduledAtColumn(
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

export async function updateCandidateScheduledAt(
  itemId: string,
  scheduledAt: Date
): Promise<void> {
  await changeCandidateScheduledAtColumn(itemId, scheduledAt);
}

/** Sets scheduled exam datetime and marks candidate approval as "אושר". */
export async function confirmCandidateExamSchedule(
  itemId: string,
  scheduledAt: Date
): Promise<void> {
  const { date, time } = formatMondayJerusalemWallClock(scheduledAt);
  const columnValues = JSON.stringify({
    [MONDAY_COLUMNS.scheduledAt]: { date, time },
    [MONDAY_COLUMNS.statusConfirm]: { label: CONFIRM_STATUS.APPROVED },
  });

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation ConfirmCandidateExamSchedule(
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

export async function updateCandidateConfirmStatus(
  itemId: string,
  status: ConfirmStatus
): Promise<void> {
  const columnValues = JSON.stringify({
    [MONDAY_COLUMNS.statusConfirm]: { label: status },
  });

  await mondayFetch<ChangeMultipleColumnValuesData>({
    query: `
      mutation UpdateCandidateConfirmStatus(
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

