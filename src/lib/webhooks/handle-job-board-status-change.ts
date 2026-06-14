import { NextResponse } from "next/server";
import { initializeCandidateItem } from "@/lib/candidate/initialize-candidate";
import {
  createExamBoardCandidateItem,
  fetchJobBoardCandidateContact,
  linkJobBoardItemToExamBoardItem,
} from "@/lib/candidate/job-board-to-exam-board";
import type { MondayWebhookEvent } from "@/lib/webhooks/monday-event";
import { eventBoardId, parseItemId } from "@/lib/webhooks/monday-event";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleJobBoardStatusChange(event: MondayWebhookEvent) {
  const jobBoardId = eventBoardId(event);
  const jobBoardItemId = parseItemId(event);

  if (!jobBoardId || !jobBoardItemId) {
    return NextResponse.json(
      { error: "Missing board id or item id in Job Board event" },
      { status: 400 }
    );
  }

  const contact = await fetchJobBoardCandidateContact({
    boardId: jobBoardId,
    itemId: jobBoardItemId,
  });

  if (!contact.email || !EMAIL_RE.test(contact.email)) {
    return NextResponse.json(
      {
        jobBoardId,
        jobBoardItemId,
        status: "pending",
        reason: "missing_email",
      },
      { status: 200 }
    );
  }

  const examBoardItemId = await createExamBoardCandidateItem({
    name: contact.name,
    email: contact.email,
    phone: contact.phone || undefined,
  });

  await linkJobBoardItemToExamBoardItem({
    jobBoardId,
    jobBoardItemId,
    examBoardItemId,
  });

  const result = await initializeCandidateItem({
    itemId: examBoardItemId,
    name: contact.name,
    email: contact.email,
    phone: contact.phone || undefined,
  });

  return NextResponse.json(
    {
      jobBoardId,
      jobBoardItemId,
      examBoardItemId: result.itemId,
      status: result.alreadyInitialized ? "already_initialized" : "initialized",
      scheduled: result.scheduled,
    },
    { status: 200 }
  );
}
