/** Default team contact email set on new candidates (Monday column email_mm3zrjey). */
export const MONDAY_TEAM_EMAIL = "office@beyondtcode.com";

/**
 * Placeholder scheduled date on create_item so Monday “send details” automations
 * do not use the real admin-entered date. Replaced immediately after create.
 */
export const MONDAY_PLACEHOLDER_SCHEDULED_DATE = {
  date: "1900-01-01",
  time: "00:00:00",
} as const;

export const MONDAY_COLUMNS = {
  name: "name",
  email: "email_mm3xm226",
  /** Team / office email (editable on the Monday board) */
  teamEmail: "email_mm3zrjey",
  /** Legacy dropdown — optional on board */
  jobPosition: "dropdown_mm3xjjdw",
  magicLinkToken: "text_mm3x9923",
  examStatus: "color_mm3xcqrz",
  startTime: "date_mm3xk9m5",
  grade: "numeric_mm3x35gv",
  tabLeaves: "numeric_mm3x9dsz",
  /** Pass / fail (status/color): עבר, לא עבר */
  passResult: "color_mm4089xy",
  /** Board column "אישור מועמד" (labels: אושר, נדחה, ממתין לאישור) */
  statusConfirm: "color_mm3y4vv1",
  /** Exam type (status/color): מבחן א / ב / ג */
  examType: "color_mm3zj3j9",
  /** Candidate source (text) */
  candidateSource: "text_mm3zwgfx",
  /** Scheduled interview/exam datetime */
  scheduledAt: "date_mm3y4hj6",
  /** Candidate phone */
  phone: "phone_mm40xg8n",
  /** Notes / הערות (text) */
  notes: "text_mm40g870",
  /** Candidate track (status/color): רגיל, ג'וניור */
  candidateTrack: "color_mm4cdx81",
} as const;

export const CANDIDATE_TRACK = {
  REGULAR: "רגיל",
  JUNIOR: "ג'וניור",
} as const;

export type CandidateTrack =
  (typeof CANDIDATE_TRACK)[keyof typeof CANDIDATE_TRACK];

export const CANDIDATE_TRACK_OPTIONS: readonly CandidateTrack[] = [
  CANDIDATE_TRACK.REGULAR,
  CANDIDATE_TRACK.JUNIOR,
];

export const DEFAULT_CANDIDATE_TRACK: CandidateTrack = CANDIDATE_TRACK.REGULAR;

export function isCandidateTrack(value: string): value is CandidateTrack {
  return (CANDIDATE_TRACK_OPTIONS as readonly string[]).includes(value);
}

/** Columns on template Job Boards (shared across dynamically created boards). */
export const JOB_BOARD_COLUMNS = {
  /** Connect column linking to the Central Exam Board item */
  examBoardLink: "board_relation_mm44c77e",
} as const;

export const CONFIRM_STATUS = {
  APPROVED: "אושר",
  POSTPONED: "נדחה",
} as const;

export type ConfirmStatus = (typeof CONFIRM_STATUS)[keyof typeof CONFIRM_STATUS];

export const EXAM_STATUS = {
  NOT_STARTED: "טרם התחיל",
  /** QStash alarm sets this label to trigger SuperMail in Monday */
  SEND_EXAM_NOW: "שלח מבחן כעת",
  INVITE_SENT: "נשלח קישור למבחן",
  IN_PROGRESS: "בתהליך",
  SUBMITTED: "הוגש",
  BLOCKED: "חסום",
} as const;

export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

export const EXAM_PASSING_SCORE = 60;

export const PASS_RESULT = {
  PASSED: "עבר",
  FAILED: "לא עבר",
} as const;

export type PassResult = (typeof PASS_RESULT)[keyof typeof PASS_RESULT];

export function passResultLabelFromScore(score: number): PassResult {
  return score >= EXAM_PASSING_SCORE ? PASS_RESULT.PASSED : PASS_RESULT.FAILED;
}

export function passResultLabelFromSubmission(
  score: number,
  examStatus: string
): PassResult {
  if (examStatus === EXAM_STATUS.BLOCKED) {
    return PASS_RESULT.FAILED;
  }
  return passResultLabelFromScore(score);
}
