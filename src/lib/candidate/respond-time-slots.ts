import {
  jerusalemWallClockToInstant,
} from "@/lib/monday/datetime";

export const RESPOND_TIME_SLOTS = ["10:00", "17:00", "20:00"] as const;

export type RespondTimeSlot = (typeof RESPOND_TIME_SLOTS)[number];

export function isRespondTimeSlot(value: string): value is RespondTimeSlot {
  return (RESPOND_TIME_SLOTS as readonly string[]).includes(value);
}

export function combineDateAndTime(
  dateKey: string,
  timeSlot: RespondTimeSlot
): Date {
  return jerusalemWallClockToInstant(dateKey, timeSlot);
}

export function formatAdminScheduledDateLabel(dateKey: string): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const weekday = date.toLocaleDateString("he-IL", { weekday: "long" });
  return `התאריך שנבחר עבורך למבחן: יום ${weekday}, ${day}/${month}/${year}`;
}

/** dd/mm/yyyy for exam-confirm flow (Jerusalem local, stored directly on Monday). */
export function formatScheduledExamDateDisplay(
  mondayDateKey: string,
  _mondayTime: string
): string {
  const match = mondayDateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** HH:mm for exam-confirm flow (Jerusalem local, stored directly on Monday). */
export function formatScheduledExamTimeDisplay(
  _mondayDateKey: string,
  mondayTime: string
): string {
  const match = mondayTime.trim().match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}
