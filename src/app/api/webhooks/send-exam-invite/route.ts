import { NextResponse } from "next/server";
import {
  getScheduledCandidateRow,
  isEligibleForExamInvite,
  scheduledInstantFromRow,
  triggerSuperMailExamDispatch,
} from "@/lib/monday/scheduled";
import { verifyQStashRequest } from "@/lib/qstash/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookBody = {
  itemId?: unknown;
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!(await verifyQStashRequest(request, rawBody))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const itemId =
    typeof body.itemId === "string" && body.itemId.trim()
      ? body.itemId.trim()
      : null;

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  try {
    const row = await getScheduledCandidateRow(itemId);

    if (!row) {
      return NextResponse.json(
        { itemId, status: "skipped", reason: "not_found" },
        { status: 200 }
      );
    }

    if (!isEligibleForExamInvite(row)) {
      return NextResponse.json(
        { itemId, status: "skipped", reason: "not_eligible" },
        { status: 200 }
      );
    }

    const scheduledAt = scheduledInstantFromRow(row);
    const earliestFireMs = scheduledAt ? scheduledAt.getTime() - 2 * 60 * 1000 : null;
    if (earliestFireMs !== null && Date.now() < earliestFireMs) {
      return NextResponse.json(
        { itemId, status: "skipped", reason: "too_early" },
        { status: 200 }
      );
    }

    await triggerSuperMailExamDispatch(itemId);

    return NextResponse.json({ itemId, status: "triggered" });
  } catch (error) {
    console.error(`[webhooks/send-exam-invite] item ${itemId}:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, itemId }, { status: 500 });
  }
}
