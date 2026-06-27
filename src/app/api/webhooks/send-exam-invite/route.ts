import { NextResponse } from "next/server";
import { MONDAY_COLUMNS } from "@/lib/monday/columns";
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

function ineligibilityDetail(
  reason: NonNullable<ReturnType<typeof examInviteIneligibilityReason>>,
  row: {
    examStatus: string;
    statusConfirm: string;
    email: string;
    magicLinkToken: string;
    examTypeLabel: string;
    scheduledDate: string;
    scheduledTime: string;
  }
): string {
  switch (reason) {
    case "placeholder_date":
      return `scheduled date is still the placeholder (${row.scheduledDate} ${row.scheduledTime})`;
    case "not_approved":
      return `statusConfirm is "${row.statusConfirm}" (expected "אושר")`;
    case "exam_already_started":
      return `examStatus is "${row.examStatus}" (expected "טרם התחיל")`;
    case "missing_email_or_token":
      return `email present=${Boolean(row.email.trim())}, magicLinkToken present=${Boolean(row.magicLinkToken.trim())}`;
    case "invalid_exam_type":
      return `examType label "${row.examTypeLabel}" is not a recognized exam type`;
    default:
      return reason;
  }
}

export async function POST(request: Request) {
  console.info("[exam-invite-alarm] webhook triggered");

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (error) {
    console.error("[exam-invite-alarm] failed to read request body:", error);
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  try {
    const verification = await verifyQStashRequest(request, rawBody);
    if (!verification.ok) {
      console.error("[exam-invite-alarm] QStash signature verification failed", {
        reason: verification.reason,
        error: verification.error,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.info("[exam-invite-alarm] QStash signature verified");

    let body: WebhookBody;
    try {
      body = JSON.parse(rawBody) as WebhookBody;
    } catch (error) {
      console.error("[exam-invite-alarm] invalid JSON body:", error);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const itemId =
      typeof body.itemId === "string" && body.itemId.trim()
        ? body.itemId.trim()
        : null;

    if (!itemId) {
      console.warn("[exam-invite-alarm] webhook rejected: missing itemId", { body });
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    console.info("[exam-invite-alarm] processing item", { itemId });

    const row = await getScheduledCandidateRow(itemId);

    if (!row) {
      console.warn("[exam-invite-alarm] skipped: item not found in Monday", { itemId });
      return NextResponse.json(
        { itemId, status: "skipped", reason: "not_found" },
        { status: 200 }
      );
    }

    console.info("[exam-invite-alarm] Monday item fetched", {
      itemId,
      name: row.name,
      scheduledDate: row.scheduledDate,
      scheduledTime: row.scheduledTime,
      examStatus: row.examStatus,
      statusConfirm: row.statusConfirm,
      statusColumn: MONDAY_COLUMNS.statusConfirm,
      emailPresent: Boolean(row.email.trim()),
      magicLinkTokenPresent: Boolean(row.magicLinkToken.trim()),
      examTypeLabel: row.examTypeLabel,
    });

    const ineligibility = examInviteIneligibilityReason(row);
    if (ineligibility) {
      const detail = ineligibilityDetail(ineligibility, row);
      console.warn(
        `[SKIP] Candidate ${itemId} is not eligible because: ${detail}`,
        {
          itemId,
          reason: ineligibility,
          examStatus: row.examStatus,
          statusConfirm: row.statusConfirm,
          statusColumn: MONDAY_COLUMNS.statusConfirm,
          emailPresent: Boolean(row.email.trim()),
        }
      );
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

    console.info("[exam-invite-alarm] triggering SuperMail dispatch", {
      itemId,
      scheduledAt: scheduledAt?.toISOString(),
    });

    await triggerSuperMailExamDispatch(itemId);

    console.info("[exam-invite-alarm] SuperMail dispatch triggered successfully", {
      itemId,
      scheduledAt: scheduledAt?.toISOString(),
    });

    return NextResponse.json({ itemId, status: "triggered" });
  } catch (error) {
    console.error("[exam-invite-alarm] unhandled error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
