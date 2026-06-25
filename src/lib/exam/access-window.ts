import { instantToJerusalemWallClock } from "@/lib/monday/datetime";
import { EXAM_STATUS } from "@/lib/monday/columns";
import {
  getScheduledCandidateRow,
  scheduledInstantFromRow,
} from "@/lib/monday/scheduled";
import type { CandidateRecord } from "@/lib/monday/types";
import {
  EXAM_ALREADY_SUBMITTED_ERROR_HE,
  EXAM_BLOCKED_ERROR_HE,
  EXAM_LOAD_ERROR_HE,
  type ExamAccessReason,
} from "./errors";

export const EXAM_ENTRY_WINDOW_MS = 15 * 60 * 1000;

export type ExamAllowedPhase = "welcome" | "exam";

export type ExamEntryWindowViolation = "too_early" | "window_expired";

export function examEntryWindowViolation(
  scheduledAt: Date | null,
  now: Date = new Date()
): ExamEntryWindowViolation | null {
  if (!scheduledAt) {
    return null;
  }

  const startMs = scheduledAt.getTime();
  const endMs = startMs + EXAM_ENTRY_WINDOW_MS;
  const nowMs = now.getTime();

  if (nowMs < startMs) {
    return "too_early";
  }

  if (nowMs > endMs) {
    return "window_expired";
  }

  return null;
}

function formatScheduledInstantForDisplay(scheduledAt: Date): string {
  const { dateKey, timeHm } = instantToJerusalemWallClock(scheduledAt);
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return timeHm;
  }

  const [, , month, day] = match;
  return `${day}/${month} בשעה ${timeHm}`;
}

export function examEntryWindowErrorMessage(
  violation: ExamEntryWindowViolation,
  scheduledAt: Date
): string {
  const when = formatScheduledInstantForDisplay(scheduledAt);

  if (violation === "too_early") {
    return `עדיין לא הגיע מועד המבחן. ניתן יהיה להיכנס ב-${when}.`;
  }

  return `חלון הכניסה למבחן נסגר. הוזמנת למבחן ב-${when} וניתן היה להיכנס בתוך 15 דקות ממועד ההזמנה. נא לפנות למנהל הגיוס.`;
}

export type ExamEntryWindowCheckResult =
  | { ok: true }
  | { ok: false; reason: ExamAccessReason; error: string };

export type ResolveExamAuthAccessResult =
  | {
      allowed: true;
      phase: ExamAllowedPhase;
      examStatus: CandidateRecord["status"];
    }
  | { allowed: false; reason: ExamAccessReason; error: string };

export async function resolveExamAuthAccess(
  candidate: CandidateRecord,
  now: Date = new Date()
): Promise<ResolveExamAuthAccessResult> {
  if (candidate.status === EXAM_STATUS.BLOCKED) {
    return {
      allowed: false,
      reason: "blocked",
      error: EXAM_BLOCKED_ERROR_HE,
    };
  }

  if (candidate.status === EXAM_STATUS.SUBMITTED) {
    return {
      allowed: false,
      reason: "submitted",
      error: EXAM_ALREADY_SUBMITTED_ERROR_HE,
    };
  }

  if (candidate.status === EXAM_STATUS.IN_PROGRESS) {
    return {
      allowed: true,
      phase: "exam",
      examStatus: candidate.status,
    };
  }

  const entryWindow = await checkExamEntryWindow(candidate.itemId, now);
  if (!entryWindow.ok) {
    return {
      allowed: false,
      reason: entryWindow.reason,
      error: entryWindow.error,
    };
  }

  if (
    candidate.status === EXAM_STATUS.NOT_STARTED ||
    candidate.status === EXAM_STATUS.SEND_EXAM_NOW
  ) {
    return {
      allowed: true,
      phase: "welcome",
      examStatus: candidate.status,
    };
  }

  return {
    allowed: false,
    reason: "window_expired",
    error: EXAM_LOAD_ERROR_HE,
  };
}

export async function checkExamEntryWindow(
  itemId: string,
  now: Date = new Date()
): Promise<ExamEntryWindowCheckResult> {
  const row = await getScheduledCandidateRow(itemId);
  if (!row) {
    return { ok: true };
  }

  const scheduledAt = scheduledInstantFromRow(row);
  const violation = examEntryWindowViolation(scheduledAt, now);
  if (!violation || !scheduledAt) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: violation,
    error: examEntryWindowErrorMessage(violation, scheduledAt),
  };
}
