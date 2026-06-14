import { NextResponse } from "next/server";
import { getScheduledCandidateRow } from "@/lib/monday/scheduled";
import { scheduleExamInviteFromRow } from "@/lib/qstash/schedule-exam-invite";
import { handleJobBoardStatusChange } from "@/lib/webhooks/handle-job-board-status-change";
import {
  isApprovedConfirmStatusChange,
  isCentralExamBoardEvent,
  isChangeColumnValueEvent,
  parseItemId,
  statusLabelText,
  type MondayWebhookEvent,
} from "@/lib/webhooks/monday-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MondayWebhookBody = {
  challenge?: string;
  event?: MondayWebhookEvent;
};

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

  if (!isCentralExamBoardEvent(event)) {
    if (isChangeColumnValueEvent(event)) {
      try {
        return await handleJobBoardStatusChange(event);
      } catch (error) {
        const itemId = parseItemId(event);
        console.error(
          `[webhooks/monday-status-change] job board${itemId ? ` item ${itemId}` : ""}:`,
          error
        );
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
          { error: message, ...(itemId ? { itemId } : {}) },
          { status: 500 }
        );
      }
    }

    console.info("[webhooks/monday-status-change] ignored:", {
      reason: "unsupported_non_exam_board_event",
      boardId: event.boardId,
      type: event.type,
      columnId: event.columnId,
    });
    return NextResponse.json(
      { status: "ignored", reason: "unsupported_non_exam_board_event" },
      { status: 200 }
    );
  }

  if (!isApprovedConfirmStatusChange(event)) {
    console.info("[webhooks/monday-status-change] ignored:", {
      reason: "not_approved_status_change",
      boardId: event.boardId,
      columnId: event.columnId,
      statusLabel: statusLabelText(event),
      type: event.type,
    });
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
      console.info("[webhooks/monday-status-change] skipped:", {
        itemId,
        reason: "not_found",
      });
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
