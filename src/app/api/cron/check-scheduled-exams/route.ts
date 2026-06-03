import { NextResponse } from "next/server";
import { buildExamMagicLink } from "@/lib/app-url";
import { cronConfig } from "@/lib/env";
import { sendExamInviteEmail } from "@/lib/email/smtp";
import {
  filterDueCandidates,
  getIsraelScheduleMinute,
  listBoardItemsForCron,
  markExamInviteSent,
} from "@/lib/monday/scheduled";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 && token === cronConfig.secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const israelNow = getIsraelScheduleMinute();
  const errors: Array<{ itemId: string; message: string }> = [];
  let sent = 0;
  let skipped = 0;

  try {
    const allRows = await listBoardItemsForCron();
    const due = filterDueCandidates(allRows, israelNow);
    skipped = allRows.length - due.length;

    for (const row of due) {
      try {
        const magicLinkUrl = buildExamMagicLink(row.magicLinkToken);

        await sendExamInviteEmail({
          to: row.email,
          candidateName: row.name,
          examTypeLabel: row.examTypeLabel,
          magicLinkUrl,
        });

        await markExamInviteSent(row.itemId);
        sent += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[cron/check-scheduled-exams] item ${row.itemId}:`,
          error
        );
        errors.push({ itemId: row.itemId, message });
      }
    }

    return NextResponse.json({
      israelNow,
      processed: due.length,
      sent,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("[cron/check-scheduled-exams]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, israelNow, sent, skipped, errors },
      { status: 500 }
    );
  }
}
