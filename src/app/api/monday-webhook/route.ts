import { NextResponse } from "next/server";
import { initializeCandidateItem } from "@/lib/candidate/initialize-candidate";
import { mondayConfig } from "@/lib/env";
import { MONDAY_COLUMNS } from "@/lib/monday/columns";
import { handleJobBoardStatusChange } from "@/lib/webhooks/handle-job-board-status-change";
import {
  eventBoardId,
  isCentralExamBoardEvent,
  isChangeColumnValueEvent,
  parseItemId,
  type MondayWebhookEvent,
} from "@/lib/webhooks/monday-event";
import { verifyMondayWebhookSecret } from "@/lib/webhooks/verify-monday-webhook-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MondayWebhookBody = {
  challenge?: string;
  event?: MondayWebhookEvent;
};

function isCreatePulseEvent(event: MondayWebhookEvent): boolean {
  return !event.type || event.type === "create_pulse";
}

function isExamBoardCreateEvent(event: MondayWebhookEvent): boolean {
  const boardId = eventBoardId(event);
  if (!boardId) {
    return true;
  }
  return boardId === String(mondayConfig.boardId);
}

function readEmailFromRaw(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  if (raw && typeof raw === "object") {
    const emailObj = raw as { email?: unknown; text?: unknown };
    if (typeof emailObj.email === "string" && emailObj.email.trim()) {
      return emailObj.email.trim();
    }
    if (typeof emailObj.text === "string" && emailObj.text.trim()) {
      return emailObj.text.trim();
    }
  }

  return undefined;
}

function readPhoneFromRaw(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  if (raw && typeof raw === "object") {
    const phoneObj = raw as { phone?: unknown };
    if (typeof phoneObj.phone === "string" && phoneObj.phone.trim()) {
      return phoneObj.phone.trim();
    }
  }

  return undefined;
}

function readEmailFromColumnValues(
  columnValues: Record<string, unknown> | undefined
): string | undefined {
  if (!columnValues) {
    return undefined;
  }

  return readEmailFromRaw(columnValues[MONDAY_COLUMNS.email]);
}

function readPhoneFromColumnValues(
  columnValues: Record<string, unknown> | undefined
): string | undefined {
  if (!columnValues) {
    return undefined;
  }

  return readPhoneFromRaw(columnValues[MONDAY_COLUMNS.phone]);
}

function isMissingEmailError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("missing a valid email address")
  );
}

async function handleExamBoardCreatePulse(event: MondayWebhookEvent) {
  const itemId = parseItemId(event);
  if (!itemId) {
    return NextResponse.json(
      { error: "Missing item id in event" },
      { status: 400 }
    );
  }

  const name =
    typeof event.pulseName === "string" && event.pulseName.trim()
      ? event.pulseName.trim()
      : undefined;

  try {
    const result = await initializeCandidateItem({
      itemId,
      name,
      email: readEmailFromColumnValues(event.columnValues),
      phone: readPhoneFromColumnValues(event.columnValues),
    });

    return NextResponse.json(
      {
        itemId: result.itemId,
        status: result.alreadyInitialized ? "already_initialized" : "initialized",
        scheduled: result.scheduled,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isMissingEmailError(error)) {
      return NextResponse.json(
        {
          itemId,
          status: "pending",
          reason: "missing_email",
        },
        { status: 200 }
      );
    }

    throw error;
  }
}

export async function POST(request: Request) {
  if (!verifyMondayWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    if (isChangeColumnValueEvent(event)) {
      if (isCentralExamBoardEvent(event)) {
        return NextResponse.json(
          { status: "ignored", reason: "exam_board_column_change" },
          { status: 200 }
        );
      }

      return await handleJobBoardStatusChange(event);
    }

    if (isCreatePulseEvent(event)) {
      if (!isExamBoardCreateEvent(event)) {
        return NextResponse.json(
          { status: "ignored", reason: "not_exam_board_create" },
          { status: 200 }
        );
      }

      return await handleExamBoardCreatePulse(event);
    }

    return NextResponse.json(
      { status: "ignored", reason: "unsupported_event_type" },
      { status: 200 }
    );
  } catch (error) {
    const itemId = parseItemId(event);
    console.error(
      `[api/monday-webhook]${itemId ? ` item ${itemId}` : ""}:`,
      error
    );
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, ...(itemId ? { itemId } : {}) },
      { status: 500 }
    );
  }
}
