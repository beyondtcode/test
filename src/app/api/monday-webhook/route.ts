import { NextResponse } from "next/server";
import { initializeCandidateItem } from "@/lib/candidate/initialize-candidate";
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

function isCandidateColumnUpdate(event: MondayWebhookEvent): boolean {
  if (!event.type || !COLUMN_UPDATE_EVENT_TYPES.has(event.type)) {
    return false;
  }

  return (
    event.columnId === MONDAY_COLUMNS.email ||
    event.columnId === MONDAY_COLUMNS.phone
  );
}

function shouldProcessEvent(event: MondayWebhookEvent): boolean {
  if (!event.type || event.type === "create_pulse") {
    return true;
  }

  return isCandidateColumnUpdate(event);
}

function parseCandidateFromEvent(event: MondayWebhookEvent): {
  itemId: string;
  name?: string;
  email?: string;
  phone?: string;
} | null {
  const itemId = parseItemId(event);
  if (!itemId) {
    return null;
  }

  const name =
    typeof event.pulseName === "string" && event.pulseName.trim()
      ? event.pulseName.trim()
      : undefined;

  let email = readEmailFromColumnValues(event.columnValues);
  let phone = readPhoneFromColumnValues(event.columnValues);

  if (event.columnId === MONDAY_COLUMNS.email) {
    email = readEmailFromRaw(event.value) ?? email;
  }

  if (event.columnId === MONDAY_COLUMNS.phone) {
    phone = readPhoneFromRaw(event.value) ?? phone;
  }

  return {
    itemId,
    name,
    email,
    phone,
  };
}

function isMissingEmailError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("missing a valid email address")
  );
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

  const candidate = parseCandidateFromEvent(event);
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
    if (
      isMissingEmailError(error) &&
      (!event.type || event.type === "create_pulse")
    ) {
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
