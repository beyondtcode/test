export type ExamRuleType = "normal" | "warning";

export type ExamRule = {
  text: string;
  type: ExamRuleType;
};

export function getExamRules(durationMinutes: number): ExamRule[] {
  return [
    {
      text: `יש לך מגבלת זמן קשיחה של ${durationMinutes} דקות.`,
      type: "normal",
    },
    {
      text: "לא ניתן להשהות את הטיימר לאחר תחילת המבחן.",
      type: "normal",
    },
    {
      text: "המבחן יוגש אוטומטית עם סיום הזמן.",
      type: "normal",
    },
    {
      text: "אסור להשתמש במחשבון במהלך המבחן — אין להשתמש בו כלל.",
      type: "warning",
    },
    {
      text: `לפני תחילת המבחן, הגדירי בהגדרות המחשב או הטלפון את זמן כיבוי המסך ומצב השינה לזמן ארוך יותר ממשך המבחן (לפחות ${durationMinutes} דקות). כיבוי מסך או מעבר למצב שינה עלולים לחסום את המבחן.`,
      type: "warning",
    },
    {
      text: "חשוב מאוד: אסור לצאת ממסך המבחן. יציאה אחת בלבד תחסום את המבחן באופן מיידי.",
      type: "warning",
    },
    {
      text: "ההתקדמות נשמרת מקומית במקרה של רענון הדף.",
      type: "normal",
    },
  ];
}
