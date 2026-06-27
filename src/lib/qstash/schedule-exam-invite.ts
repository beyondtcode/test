import { getAppBaseUrl } from "@/lib/app-url";
import { qstashConfig } from "@/lib/env";
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

function assertPublicExamInviteWebhookUrl(destination: string): void {
  let hostname: string;
  try {
    hostname = new URL(destination).hostname;
  } catch {
    throw new Error(`Invalid exam invite webhook URL: ${destination}`);
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  ) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be a public HTTPS URL so QStash can reach /api/webhooks/send-exam-invite (localhost is rejected by QStash)."
    );
  }
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
  assertPublicExamInviteWebhookUrl(destination);
  const alarmKey = examInviteDeduplicationId(itemId);

  const publishResult = await getQStashClient().publishJSON({
    url: destination,
    body: { itemId },
    notBefore,
    deduplicationId: alarmKey,
    label: alarmKey,
    flowControl: { key: alarmKey, parallelism: 1 },
  });

  console.info("[exam-invite-alarm] scheduled", {
    itemId,
    messageId: publishResult.messageId,
    fireAt: scheduledAt.toISOString(),
    notBefore,
    destination,
    deduplicationId: alarmKey,
  });
}

export type ExamInviteScheduleResult =
  | { status: "scheduled"; itemId: string; fireAt: string }
  | {
      status: "skipped";
      itemId: string;
      reason: "no_scheduled_date" | "already_scheduled";
      fireAt?: string;
    }
  | { status: "failed"; itemId: string; error: string };

const PENDING_ALARM_STATES = ["CREATED", "ACTIVE", "RETRY"] as const;

type QStashLogEntry = {
  messageId?: string;
  notBefore?: number;
  state?: string;
};

type QStashLogsResponse = {
  logs?: QStashLogEntry[];
};

export type PendingExamInviteAlarm = {
  messageId: string;
  fireAt: Date;
};

/** Returns a future pending exam-invite alarm for this item, if one exists. */
export async function getPendingExamInviteAlarm(
  itemId: string
): Promise<PendingExamInviteAlarm | null> {
  const label = examInviteDeduplicationId(itemId);
  const destination = examInviteWebhookUrl();
  const baseUrl = qstashConfig.url.replace(/\/$/, "");
  const params = new URLSearchParams({
    url: destination,
    count: "10",
  });
  params.append("label", label);
  for (const state of PENDING_ALARM_STATES) {
    params.append("state", state);
  }

  const response = await fetch(`${baseUrl}/v2/logs?${params}`, {
    headers: { Authorization: `Bearer ${qstashConfig.token}` },
  });

  if (!response.ok) {
    throw new Error(`QStash logs query failed (${response.status})`);
  }

  const data = (await response.json()) as QStashLogsResponse;
  const now = Date.now();

  const pending = (data.logs ?? [])
    .filter(
      (log): log is QStashLogEntry & { messageId: string; notBefore: number } =>
        typeof log.messageId === "string" &&
        typeof log.notBefore === "number" &&
        log.notBefore * 1000 > now - 60_000
    )
    .sort((a, b) => a.notBefore - b.notBefore);

  const next = pending[0];
  if (!next) {
    return null;
  }

  return {
    messageId: next.messageId,
    fireAt: new Date(next.notBefore * 1000),
  };
}

function scheduleErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown QStash error";
}

/** Schedules QStash and returns a structured result instead of failing silently. */
export async function scheduleExamInviteAlarmWithResult(
  itemId: string,
  scheduledAt: Date
): Promise<ExamInviteScheduleResult> {
  try {
    await scheduleExamInviteAlarm(itemId, scheduledAt);
    return {
      status: "scheduled",
      itemId,
      fireAt: scheduledAt.toISOString(),
    };
  } catch (error) {
    const message = scheduleErrorMessage(error);
    console.error(`[exam-invite-alarm] schedule failed for item ${itemId}:`, error);
    return { status: "failed", itemId, error: message };
  }
}

/** (Re)schedules from Monday date/time; fires immediately if that time has passed. */
export async function scheduleExamInviteFromRow(
  row: ScheduledCandidateRow
): Promise<void> {
  const result = await scheduleExamInviteFromRowWithResult(row);
  if (result.status === "failed") {
    throw new Error(result.error);
  }
}

function examInviteFireAtFromRow(
  row: Pick<ScheduledCandidateRow, "scheduledDate" | "scheduledTime">
): Date | null {
  const scheduled = scheduledInstantFromRow(row);
  if (!scheduled) {
    return null;
  }

  return new Date(Math.max(scheduled.getTime(), Date.now()));
}

/** Like scheduleExamInviteFromRow but never throws and reports skip/fail reasons. */
export async function scheduleExamInviteFromRowWithResult(
  row: ScheduledCandidateRow
): Promise<ExamInviteScheduleResult> {
  const fireAt = examInviteFireAtFromRow(row);
  if (!fireAt) {
    console.warn(
      `[exam-invite-alarm] not scheduled for item ${row.itemId}: no valid scheduled date`
    );
    return {
      status: "skipped",
      itemId: row.itemId,
      reason: "no_scheduled_date",
    };
  }

  return scheduleExamInviteAlarmWithResult(row.itemId, fireAt);
}

/**
 * Schedules only when no pending alarm exists (Monday webhook path).
 * Does not cancel an existing alarm — candidate confirm / admin reschedule own that.
 */
export async function scheduleExamInviteAlarmUnlessPending(
  itemId: string,
  scheduledAt: Date
): Promise<ExamInviteScheduleResult> {
  try {
    const pending = await getPendingExamInviteAlarm(itemId).catch((error) => {
      console.warn(
        `[exam-invite-alarm] could not query pending alarm for item ${itemId}; relying on deduplication`,
        error
      );
      return null;
    });
    if (pending) {
      console.info("[exam-invite-alarm] skipped (pending alarm exists)", {
        itemId,
        existingFireAt: pending.fireAt.toISOString(),
        messageId: pending.messageId,
      });
      return {
        status: "skipped",
        itemId,
        reason: "already_scheduled",
        fireAt: pending.fireAt.toISOString(),
      };
    }

    const notBefore = Math.floor(scheduledAt.getTime() / 1000);
    const destination = examInviteWebhookUrl();
    assertPublicExamInviteWebhookUrl(destination);
    const alarmKey = examInviteDeduplicationId(itemId);

    const publishResult = await getQStashClient().publishJSON({
      url: destination,
      body: { itemId },
      notBefore,
      deduplicationId: alarmKey,
      label: alarmKey,
      flowControl: { key: alarmKey, parallelism: 1 },
    });

    if (publishResult.deduplicated) {
      console.info("[exam-invite-alarm] skipped (QStash deduplicated)", {
        itemId,
        messageId: publishResult.messageId,
      });
      return {
        status: "skipped",
        itemId,
        reason: "already_scheduled",
      };
    }

    console.info("[exam-invite-alarm] scheduled (unless-pending)", {
      itemId,
      messageId: publishResult.messageId,
      fireAt: scheduledAt.toISOString(),
      notBefore,
      destination,
      deduplicationId: alarmKey,
    });

    return {
      status: "scheduled",
      itemId,
      fireAt: scheduledAt.toISOString(),
    };
  } catch (error) {
    const message = scheduleErrorMessage(error);
    console.error(
      `[exam-invite-alarm] unless-pending schedule failed for item ${itemId}:`,
      error
    );
    return { status: "failed", itemId, error: message };
  }
}

/**
 * Webhook-safe scheduling: only creates an alarm when none is already pending.
 * Used after Monday reports "אושר" so a candidate confirm cannot be overwritten.
 */
export async function scheduleExamInviteFromRowUnlessPending(
  row: ScheduledCandidateRow
): Promise<ExamInviteScheduleResult> {
  const fireAt = examInviteFireAtFromRow(row);
  if (!fireAt) {
    console.warn(
      `[exam-invite-alarm] not scheduled for item ${row.itemId}: no valid scheduled date`
    );
    return {
      status: "skipped",
      itemId: row.itemId,
      reason: "no_scheduled_date",
    };
  }

  return scheduleExamInviteAlarmUnlessPending(row.itemId, fireAt);
}
