import type { ExamTypeId } from "@/lib/exam/exam-types";
import type { ExamStatus } from "./columns";

export type CandidateRecord = {
  itemId: string;
  name: string;
  email: string;
  jobPosition: string;
  examTypeId: ExamTypeId;
  examTypeLabel: string;
  candidateSource: string;
  status: ExamStatus;
};

export type MondayColumnValue = {
  id: string;
  text: string | null;
  value?: string | null;
};

export type ScheduledCandidateRow = {
  itemId: string;
  name: string;
  email: string;
  examTypeLabel: string;
  magicLinkToken: string;
  scheduledDate: string;
  scheduledTime: string;
  examStatus: string;
  statusConfirm: string;
};

export type ItemsPageByColumnValuesData = {
  items_page_by_column_values: {
    items: Array<{
      id: string;
      name: string;
      column_values: MondayColumnValue[];
    }>;
  };
};

export type ChangeMultipleColumnValuesData = {
  change_multiple_column_values: {
    id: string;
  };
};

export function parseColumnText(
  columnValues: MondayColumnValue[],
  columnId: string
): string {
  const col = columnValues.find((c) => c.id === columnId);
  return col?.text?.trim() ?? "";
}
