import { NextResponse } from "next/server";
import {
  fetchCandidateContactFields,
  initializeCandidateItem,
  type InitializeCandidateInput,
} from "@/lib/candidate/initialize-candidate";
import { mondayConfig } from "@/lib/env";
import { MONDAY_COLUMNS } from "@/lib/monday/columns";
import { verifyMondayWebhookSecret } from "@/lib/webhooks/verify-monday-webhook-secret";

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
]);

function parseItemId(event: MondayWebhookEvent): string | null {
  const raw = event.itemId ?? event.pulseId;
  if (raw === undefined || raw === null) {
    return null;
  }
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

function boardIdMatches(event: MondayWebhookEvent): boolean {
  if (event.boardId === undefined || event.boardId === null) {
    return true;
  }
  return String(event.boardId) === String(mondayConfig.boardId);
}

function isCreatePulseEvent(event: MondayWebhookEvent): boolean {
  return !event.type || event.type === "create_pulse";
}

function isChangeColumnValueEvent(event: MondayWebhookEvent): boolean {
  return !!event.type && COLUMN_UPDATE_EVENT_TYPES.has(event.type);
}

function shouldProcessEvent(event: MondayWebhookEvent): boolean {
  return isCreatePulseEvent(event) || isChangeColumnValueEvent(event);
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

function parseCandidateFromCreatePulseEvent(
  event: MondayWebhookEvent
): InitializeCandidateInput | null {
  const itemId = parseItemId(event);
  if (!itemId) {
    return null;
  }

  const name =
    typeof event.pulseName === "string" && event.pulseName.trim()
      ? event.pulseName.trim()
      : undefined;

  return {
    itemId,
    name,
    email: readEmailFromColumnValues(event.columnValues),
    phone: readPhoneFromColumnValues(event.columnValues),
  };
}

async function parseCandidateFromChangeColumnValueEvent(
  event: MondayWebhookEvent
): Promise<InitializeCandidateInput | null> {
  const itemId = parseItemId(event);
  if (!itemId) {
    return null;
  }

  const contact = await fetchCandidateContactFields(itemId);

  return {
    itemId,
    name: contact.name,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
  };
}

async function resolveCandidateFromEvent(
  event: MondayWebhookEvent
): Promise<InitializeCandidateInput | null> {
  if (isChangeColumnValueEvent(event)) {
    return parseCandidateFromChangeColumnValueEvent(event);
  }

  if (isCreatePulseEvent(event)) {
    return parseCandidateFromCreatePulseEvent(event);
  }

  return null;
}

function isMissingEmailError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("missing a valid email address")
  );
}

function shouldReturnPendingForMissingEmail(event: MondayWebhookEvent): boolean {
  return isCreatePulseEvent(event) || isChangeColumnValueEvent(event);
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

  if (!boardIdMatches(event)) {
    return NextResponse.json(
      { status: "ignored", reason: "board_mismatch" },
      { status: 200 }
    );
  }

  if (!shouldProcessEvent(event)) {
    return NextResponse.json(
      { status: "ignored", reason: "unsupported_event_type" },
      { status: 200 }
    );
  }

  const candidate = await resolveCandidateFromEvent(event);
  if (!candidate) {
    return NextResponse.json(
      { error: "Missing item id in event" },
      { status: 400 }
    );
  }

  try {
    const result = await initializeCandidateItem(candidate);

    return NextResponse.json(
      {
        itemId: result.itemId,
        status: result.alreadyInitialized ? "already_initialized" : "initialized",
        scheduled: result.scheduled,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isMissingEmailError(error) && shouldReturnPendingForMissingEmail(event)) {
      return NextResponse.json(
        {
          itemId: candidate.itemId,
          status: "pending",
          reason: "missing_email",
        },
        { status: 200 }
      );
    }

    console.error(
      `[api/monday-webhook] item ${candidate.itemId}:`,
      error
    );
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, itemId: candidate.itemId },
      { status: 500 }
    );
  }
}
