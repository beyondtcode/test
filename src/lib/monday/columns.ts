export const MONDAY_COLUMNS = {
  name: "name",
  email: "email_mm3xm226",
  /** Legacy dropdown — optional on board */
  jobPosition: "dropdown_mm3xjjdw",
  magicLinkToken: "text_mm3x9923",
  examStatus: "color_mm3xcqrz",
  startTime: "date_mm3xk9m5",
  grade: "numeric_mm3x35gv",
  tabLeaves: "numeric_mm3x9dsz",
  /** Board column "אישור מועמד" (labels: אושר, נדחה, ממתין לאישור) */
  statusConfirm: "color_mm3y4vv1",
  /** Exam type (status/color): מבחן א / ב / ג */
  examType: "color_mm3zj3j9",
  /** Candidate source (text) */
  candidateSource: "text_mm3zwgfx",
  /** Scheduled interview/exam datetime */
  scheduledAt: "date_mm3y4hj6",
} as const;

export const CONFIRM_STATUS = {
  APPROVED: "אושר",
  POSTPONED: "נדחה",
} as const;

export type ConfirmStatus = (typeof CONFIRM_STATUS)[keyof typeof CONFIRM_STATUS];

export const EXAM_STATUS = {
  NOT_STARTED: "טרם התחיל",
  IN_PROGRESS: "בתהליך",
  SUBMITTED: "הוגש",
  BLOCKED: "חסום",
} as const;

export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];
