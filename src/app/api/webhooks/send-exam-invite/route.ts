import { NextResponse } from "next/server";
import {
  examInviteIneligibilityReason,
  getScheduledCandidateRow,
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
    console.warn("[exam-invite-alarm] webhook rejected: invalid QStash signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    console.warn("[exam-invite-alarm] webhook rejected: invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const itemId =
    typeof body.itemId === "string" && body.itemId.trim()
      ? body.itemId.trim()
      : null;

  if (!itemId) {
    console.warn("[exam-invite-alarm] webhook rejected: missing itemId");
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  console.info("[exam-invite-alarm] webhook fired", { itemId });

  try {
    const row = await getScheduledCandidateRow(itemId);

    if (!row) {
      console.warn("[exam-invite-alarm] skipped: item not found", { itemId });
      return NextResponse.json(
        { itemId, status: "skipped", reason: "not_found" },
        { status: 200 }
      );
    }

    const ineligibility = examInviteIneligibilityReason(row);
    if (ineligibility) {
      console.warn("[exam-invite-alarm] skipped: not eligible", {
        itemId,
        reason: ineligibility,
        statusConfirm: row.statusConfirm,
        examStatus: row.examStatus,
        scheduledDate: row.scheduledDate,
        scheduledTime: row.scheduledTime,
      });
      return NextResponse.json(
        { itemId, status: "skipped", reason: "not_eligible", detail: ineligibility },
        { status: 200 }
      );
    }

    const scheduledAt = scheduledInstantFromRow(row);
    const earliestFireMs = scheduledAt ? scheduledAt.getTime() - 2 * 60 * 1000 : null;
    if (earliestFireMs !== null && Date.now() < earliestFireMs) {
      console.warn("[exam-invite-alarm] skipped: too early", {
        itemId,
        scheduledAt: scheduledAt?.toISOString(),
        now: new Date().toISOString(),
      });
      return NextResponse.json(
        { itemId, status: "skipped", reason: "too_early" },
        { status: 200 }
      );
    }

    await triggerSuperMailExamDispatch(itemId);

    console.info("[exam-invite-alarm] triggered SuperMail dispatch", {
      itemId,
      scheduledAt: scheduledAt?.toISOString(),
    });

    return NextResponse.json({ itemId, status: "triggered" });
  } catch (error) {
    console.error(`[exam-invite-alarm] failed for item ${itemId}:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, itemId }, { status: 500 });
  }
}
