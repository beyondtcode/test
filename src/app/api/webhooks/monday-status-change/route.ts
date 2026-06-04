import { NextResponse } from "next/server";
import { mondayConfig } from "@/lib/env";
import { CONFIRM_STATUS, MONDAY_COLUMNS } from "@/lib/monday/columns";
import { getScheduledCandidateRow } from "@/lib/monday/scheduled";
import { scheduleExamInviteFromRow } from "@/lib/qstash/schedule-exam-invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MondayWebhookBody = {
  challenge?: string;
  event?: MondayWebhookEvent;
};

type MondayWebhookEvent = {
  boardId?: number | string;
  pulseId?: number | string;
  itemId?: number | string;
  columnId?: string;
  type?: string;
  value?: {
    label?: {
      text?: string;
    };
  };
};

function parseItemId(event: MondayWebhookEvent): string | null {
  const raw = event.itemId ?? event.pulseId;
  if (raw === undefined || raw === null) {
    return null;
  }
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

function statusLabelText(event: MondayWebhookEvent): string | null {
  const text = event.value?.label?.text;
  if (typeof text !== "string" || !text.trim()) {
    return null;
  }
  return text.trim();
}

function boardIdMatches(event: MondayWebhookEvent): boolean {
  if (event.boardId === undefined || event.boardId === null) {
    return true;
  }
  return String(event.boardId) === String(mondayConfig.boardId);
}

function isApprovedConfirmStatusChange(event: MondayWebhookEvent): boolean {
  if (!boardIdMatches(event)) {
    return false;
  }

  if (
    event.columnId &&
    event.columnId !== MONDAY_COLUMNS.statusConfirm
  ) {
    return false;
  }

  return statusLabelText(event) === CONFIRM_STATUS.APPROVED;
}

export async function POST(request: Request) {
  let body: MondayWebhookBody;
  try {
    body = (await request.json()) as MondayWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge }, { status: 200 });
  }

  const event = body.event;
  if (!event) {
    return NextResponse.json(
      { status: "ignored", reason: "no_event" },
      { status: 200 }
    );
  }

  if (!isApprovedConfirmStatusChange(event)) {
    return NextResponse.json(
      { status: "ignored", reason: "not_approved_status_change" },
      { status: 200 }
    );
  }

  const itemId = parseItemId(event);
  if (!itemId) {
    return NextResponse.json(
      { error: "Missing item id in event" },
      { status: 400 }
    );
  }

  try {
    const row = await getScheduledCandidateRow(itemId);
    if (!row) {
      return NextResponse.json(
        { itemId, status: "skipped", reason: "not_found" },
        { status: 200 }
      );
    }

    await scheduleExamInviteFromRow(row);

    return NextResponse.json({ itemId, status: "scheduled" }, { status: 200 });
  } catch (error) {
    console.error(`[webhooks/monday-status-change] item ${itemId}:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, itemId }, { status: 500 });
  }
}
