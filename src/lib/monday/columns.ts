export const MONDAY_COLUMNS = {
  name: "name",
  email: "email_mm3xm226",
  jobPosition: "dropdown_mm3xjjdw",
  magicLinkToken: "text_mm3x9923",
  examStatus: "color_mm3xcqrz",
  startTime: "date_mm3xk9m5",
  grade: "numeric_mm3x35gv",
  tabLeaves: "numeric_mm3x9dsz",
} as const;

export const EXAM_STATUS = {
  NOT_STARTED: "טרם התחיל",
  IN_PROGRESS: "בתהליך",
  SUBMITTED: "הוגש",
  BLOCKED: "חסום",
} as const;

export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];
