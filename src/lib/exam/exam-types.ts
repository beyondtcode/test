export const EXAM_TYPE_IDS = ["exam-a", "exam-b", "exam-c"] as const;

export type ExamTypeId = (typeof EXAM_TYPE_IDS)[number];

/** Hebrew labels stored on Monday status column and shown in admin UI */
export const EXAM_TYPE_LABELS: Record<ExamTypeId, string> = {
  "exam-a": "מבחן א",
  "exam-b": "מבחן ב",
  "exam-c": "מבחן ג",
};

const LABEL_TO_ID = Object.fromEntries(
  EXAM_TYPE_IDS.map((id) => [EXAM_TYPE_LABELS[id], id])
) as Record<string, ExamTypeId>;

export function examTypeIdFromMondayLabel(label: string): ExamTypeId | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }
  return LABEL_TO_ID[trimmed] ?? null;
}

export function isExamTypeId(value: string): value is ExamTypeId {
  return (EXAM_TYPE_IDS as readonly string[]).includes(value);
}

export const CANDIDATE_SOURCE_OPTIONS = [
  "LinkedIn",
  "חבר/ה",
  "אתר חברה",
  "משרות דרושות",
  "אחר",
] as const;
