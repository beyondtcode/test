import { getAppBaseUrl } from "@/lib/app-url";
import { scheduledInstantFromRow } from "@/lib/monday/scheduled";
import type { ScheduledCandidateRow } from "@/lib/monday/types";
import { getQStashClient } from "./client";

const EXAM_INVITE_DEDUP_PREFIX = "exam-invite";

export function examInviteDeduplicationId(itemId: string): string {
  return `${EXAM_INVITE_DEDUP_PREFIX}-${itemId}`;
}

/**
 * Schedules a single QStash delivery for one Monday item at the exam start time.
 * Re-publishing with the same deduplication id replaces any prior alarm for that item.
 */
export async function scheduleExamInviteAlarm(
  itemId: string,
  scheduledAt: Date
): Promise<void> {
  const notBefore = Math.floor(scheduledAt.getTime() / 1000);
  const destination = `${getAppBaseUrl()}/api/webhooks/send-exam-invite`;

  await getQStashClient().publishJSON({
    url: destination,
    body: { itemId },
    notBefore,
    deduplicationId: examInviteDeduplicationId(itemId),
  });
}

/** (Re)schedules from Monday date/time; fires immediately if that time has passed. */
export async function scheduleExamInviteFromRow(
  row: ScheduledCandidateRow
): Promise<void> {
  const scheduled = scheduledInstantFromRow(row);
  if (!scheduled) {
    return;
  }

  const fireAt = new Date(Math.max(scheduled.getTime(), Date.now()));
  await scheduleExamInviteAlarm(row.itemId, fireAt);
}
