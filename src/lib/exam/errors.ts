export const EXAM_LOAD_ERROR_HE =
  "חלה שגיאה בטעינת המבחן, אנא פני לצוות הגיוס.";

export const EXAM_BLOCKED_ERROR_HE =
  "המבחן שלך חסום ואין אפשרות להמשיך או להיכנס אליו שוב. נא לפנות למנהל הגיוס לבירור המשך התהליך.";

export const EXAM_ALREADY_SUBMITTED_ERROR_HE =
  "המבחן כבר הוגש. אין אפשרות להיכנס אליו שוב.";

export type ExamAccessReason =
  | "blocked"
  | "submitted"
  | "too_early"
  | "window_expired";
