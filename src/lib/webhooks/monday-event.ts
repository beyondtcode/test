import { mondayConfig } from "@/lib/env";
import { CONFIRM_STATUS, MONDAY_COLUMNS } from "@/lib/monday/columns";

export type MondayWebhookEvent = {
  boardId?: number | string;
  pulseId?: number | string;
  itemId?: number | string;
  pulseName?: string;
  type?: string;
  columnId?: string;
  columnValues?: Record<string, unknown>;
  value?: unknown;
};

const COLUMN_UPDATE_EVENT_TYPES = new Set([
  "update_column_value",
  "change_specific_column_value",
  "change_column_value",
  "change_status_column_value",
]);

export function parseItemId(event: MondayWebhookEvent): string | null {
  const raw = event.itemId ?? event.pulseId;
  if (raw === undefined || raw === null) {
    return null;
  }
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

export function eventBoardId(event: MondayWebhookEvent): string | null {
  if (event.boardId === undefined || event.boardId === null) {
    return null;
  }
  const id = String(event.boardId).trim();
  return id.length > 0 ? id : null;
}

export function isCentralExamBoardEvent(event: MondayWebhookEvent): boolean {
  const boardId = eventBoardId(event);
  if (!boardId) {
    return false;
  }
  return boardId === String(mondayConfig.boardId);
}

export function isChangeColumnValueEvent(event: MondayWebhookEvent): boolean {
  return !!event.type && COLUMN_UPDATE_EVENT_TYPES.has(event.type);
}

function statusLabelFromValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const label = (parsed as { label?: unknown }).label;
  if (label && typeof label === "object") {
    const text = (label as { text?: unknown }).text;
    if (typeof text === "string" && text.trim()) {
      return text.trim();
    }
  }

  return null;
}

export function statusLabelText(event: MondayWebhookEvent): string | null {
  return statusLabelFromValue(event.value);
}

export function isApprovedConfirmStatusChange(event: MondayWebhookEvent): boolean {
  if (!isCentralExamBoardEvent(event)) {
    return false;
  }

  if (event.columnId && event.columnId !== MONDAY_COLUMNS.statusConfirm) {
    return false;
  }

  return statusLabelText(event) === CONFIRM_STATUS.APPROVED;
}
