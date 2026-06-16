import { getAppBaseUrl } from "@/lib/app-url";
import { scheduledInstantFromRow } from "@/lib/monday/scheduled";
import type { ScheduledCandidateRow } from "@/lib/monday/types";
import { getQStashClient } from "./client";

const EXAM_INVITE_DEDUP_PREFIX = "exam-invite";

export function examInviteDeduplicationId(itemId: string): string {
  return `${EXAM_INVITE_DEDUP_PREFIX}-${itemId}`;
}

function examInviteWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/webhooks/send-exam-invite`;
}

async function cancelExamInviteAlarmsByFilter(
  filter: { label: string; url: string } | { flowControlKey: string; url: string }
): Promise<void> {
  const client = getQStashClient();
  let cancelled: number;

  do {
    const result = await client.messages.cancel({ filter });
    cancelled = result.cancelled;
  } while (cancelled > 0);
}

/** Cancels any pending QStash delivery for this candidate's exam invite. */
export async function cancelExamInviteAlarm(itemId: string): Promise<void> {
  const alarmKey = examInviteDeduplicationId(itemId);
  const destination = examInviteWebhookUrl();

  await cancelExamInviteAlarmsByFilter({ label: alarmKey, url: destination });
  await cancelExamInviteAlarmsByFilter({
    flowControlKey: alarmKey,
    url: destination,
  });
}

/**
 * Schedules a single QStash delivery for one Monday item at the exam start time.
 * Any prior pending alarm for the same item is cancelled first.
 */
export async function scheduleExamInviteAlarm(
  itemId: string,
  scheduledAt: Date
): Promise<void> {
  await cancelExamInviteAlarm(itemId);

  const notBefore = Math.floor(scheduledAt.getTime() / 1000);
  const destination = examInviteWebhookUrl();
  const alarmKey = examInviteDeduplicationId(itemId);

  await getQStashClient().publishJSON({
    url: destination,
    body: { itemId },
    notBefore,
    deduplicationId: alarmKey,
    label: alarmKey,
    flowControl: { key: alarmKey, parallelism: 1 },
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
