export const EXAM_DURATION_MS = 50 * 60 * 1000;

export type ExamQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type PublicExamQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: "q1",
    prompt: "מה משמעות ראשי התיבות HTML?",
    options: [
      "Hyper Text Markup Language — שפת סימון של היפרטקסט",
      "High Tech Modern Language — שפה מודרנית וטכנולוגית",
      "Home Tool Markup Language — שפת סימון לכלי בית",
      "Hyperlinks and Text Markup Language — קישורים וטקסט בשפת סימון",
    ],
    correctIndex: 0,
  },
  {
    id: "q2",
    prompt: "איזו שיטת HTTP משמשת בדרך כלל לאחזור מידע?",
    options: ["POST", "GET", "DELETE", "PATCH"],
    correctIndex: 1,
  },
  {
    id: "q3",
    prompt:
      "ב-JavaScript, איזו מילת מפתח יוצרת משתנה עם סקופ ברמת בלוק?",
    options: ["var", "let", "function", "static"],
    correctIndex: 1,
  },
  {
    id: "q4",
    prompt: "מהי סיבוכיות הזמן של חיפוש בינארי במערך ממויין?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correctIndex: 1,
  },
  {
    id: "q5",
    prompt: "איזה מבנה נתונים פועל לפי FIFO (First In, First Out)?",
    options: ["מחסנית (Stack)", "תור (Queue)", "עץ (Tree)", "גרף (Graph)"],
    correctIndex: 1,
  },
  {
    id: "q6",
    prompt: "מה משמעות ראשי התיבות SQL?",
    options: [
      "Structured Query Language — שפת שאילתות מובנית",
      "Simple Question Language — שפת שאלות פשוטות",
      "System Query Logic — לוגיקת שאילתות של מערכת",
      "Standard Question List — רשימת שאלות סטנדרטית",
    ],
    correctIndex: 0,
  },
  {
    id: "q7",
    prompt: "ב-Git, איזו פקודה יוצרת branch חדש ומעבירה אליה מיד?",
    options: [
      "git merge",
      "git checkout -b",
      "git pull",
      "git stash",
    ],
    correctIndex: 1,
  },
  {
    id: "q8",
    prompt: "איזה פורט הוא ברירת המחדל ל-HTTPS?",
    options: ["80", "443", "8080", "22"],
    correctIndex: 1,
  },
  {
    id: "q9",
    prompt: "מה תפקידו של מפתח ראשי (Primary Key) בטבלת מסד נתונים?",
    options: [
      "כדי לזהות באופן ייחודי כל שורה",
      "כדי להצפין נתונים",
      "כדי למיין עמודות לפי אלפבית",
      "כדי לאחסן קבצים מצורפים",
    ],
    correctIndex: 0,
  },
  {
    id: "q10",
    prompt: "איזו Hook ב-React מריצה side effects לאחר ה-render?",
    options: ["useState", "useEffect", "useMemo", "useRef"],
    correctIndex: 1,
  },
];

const DEFAULT_EXAM_TITLE = "מבחן טכני";
let examTitle = DEFAULT_EXAM_TITLE;
let examDurationMs = EXAM_DURATION_MS;
let examQuestions: ExamQuestion[] = EXAM_QUESTIONS.map((question) => ({
  ...question,
  options: [...question.options],
}));

function clonePublicQuestion(question: ExamQuestion): PublicExamQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    options: [...question.options],
  };
}

function clonePrivateQuestion(question: ExamQuestion): ExamQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    options: [...question.options],
    correctIndex: question.correctIndex,
  };
}

function normalizeQuestionId(index: number): string {
  return `q${index + 1}`;
}

function normalizeQuestions(questions: ExamQuestion[]): ExamQuestion[] {
  return questions.map((question, index) => ({
    ...clonePrivateQuestion(question),
    id: normalizeQuestionId(index),
  }));
}

export function getPublicQuestions(): PublicExamQuestion[] {
  return examQuestions.map(clonePublicQuestion);
}

export function getExamDurationMs(): number {
  return examDurationMs;
}

export function getExamQuestionCount(): number {
  return examQuestions.length;
}

export function getAdminEditableExam() {
  return {
    title: examTitle,
    durationMinutes: Math.round(examDurationMs / 60000),
    questions: examQuestions.map(clonePrivateQuestion),
  };
}

type UpdateExamInputQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type UpdateExamInput = {
  title: string;
  durationMinutes: number;
  questions: UpdateExamInputQuestion[];
};

export function updateExamDefinition(input: UpdateExamInput) {
  const nextTitle = input.title.trim();
  if (!nextTitle) {
    throw new Error("יש להזין שם למבחן.");
  }

  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 5 ||
    input.durationMinutes > 180
  ) {
    throw new Error("משך המבחן חייב להיות בין 5 ל-180 דקות.");
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    throw new Error("יש להזין לפחות שאלה אחת.");
  }

  const parsedQuestions: ExamQuestion[] = input.questions.map((question, index) => {
    const prompt = question.prompt.trim();
    if (!prompt) {
      throw new Error(`בשאלה ${index + 1} חסר נוסח שאלה.`);
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`בשאלה ${index + 1} נדרשות לפחות שתי אפשרויות.`);
    }

    const options = question.options.map((option, optionIndex) => {
      const value = option.trim();
      if (!value) {
        throw new Error(
          `בשאלה ${index + 1}, אפשרות ${optionIndex + 1} ריקה.`
        );
      }
      return value;
    });

    if (
      !Number.isInteger(question.correctIndex) ||
      question.correctIndex < 0 ||
      question.correctIndex >= options.length
    ) {
      throw new Error(`בשאלה ${index + 1} התשובה הנכונה לא תקינה.`);
    }

    return {
      id: normalizeQuestionId(index),
      prompt,
      options,
      correctIndex: question.correctIndex,
    };
  });

  examTitle = nextTitle;
  examDurationMs = input.durationMinutes * 60 * 1000;
  examQuestions = normalizeQuestions(parsedQuestions);
}

/**
 * Grades answers in question order (q1..q10). Each correct answer = 10 points.
 */
export function gradeAnswers(answers: (number | null)[]): number {
  if (answers.length !== examQuestions.length || examQuestions.length === 0) {
    return 0;
  }

  let correct = 0;
  for (let i = 0; i < examQuestions.length; i++) {
    const selected = answers[i] ?? null;
    if (selected === examQuestions[i].correctIndex) {
      correct++;
    }
  }
  return Math.round((correct / examQuestions.length) * 100);
}

export function getQuestionIds(): string[] {
  return examQuestions.map((q) => q.id);
}
