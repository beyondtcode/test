export const RESPOND_TIME_SLOTS = ["10:00", "17:00", "20:00"] as const;

export type RespondTimeSlot = (typeof RESPOND_TIME_SLOTS)[number];

export function isRespondTimeSlot(value: string): value is RespondTimeSlot {
  return (RESPOND_TIME_SLOTS as readonly string[]).includes(value);
}

export function combineDateAndTime(
  dateKey: string,
  timeSlot: RespondTimeSlot
): Date {
  const [hours, minutes] = timeSlot.split(":").map(Number);
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
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

/** dd/mm/yyyy for exam-confirm flow */
export function formatScheduledExamDateDisplay(dateKey: string): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** HH:mm from Monday date column time (e.g. 10:00:00) */
export function formatScheduledExamTimeDisplay(time: string): string {
  const match = time.trim().match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}
