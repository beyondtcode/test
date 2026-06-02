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
    prompt: "What does HTML stand for?",
    options: [
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Home Tool Markup Language",
      "Hyperlinks and Text Markup Language",
    ],
    correctIndex: 0,
  },
  {
    id: "q2",
    prompt: "Which HTTP method is typically used to retrieve data?",
    options: ["POST", "GET", "DELETE", "PATCH"],
    correctIndex: 1,
  },
  {
    id: "q3",
    prompt: "In JavaScript, which keyword declares a block-scoped variable?",
    options: ["var", "let", "function", "static"],
    correctIndex: 1,
  },
  {
    id: "q4",
    prompt: "What is the time complexity of binary search on a sorted array?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correctIndex: 1,
  },
  {
    id: "q5",
    prompt: "Which data structure uses FIFO ordering?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correctIndex: 1,
  },
  {
    id: "q6",
    prompt: "What does SQL stand for?",
    options: [
      "Structured Query Language",
      "Simple Question Language",
      "System Query Logic",
      "Standard Question List",
    ],
    correctIndex: 0,
  },
  {
    id: "q7",
    prompt: "In Git, which command creates a new branch and switches to it?",
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
    prompt: "Which port is the default for HTTPS?",
    options: ["80", "443", "8080", "22"],
    correctIndex: 1,
  },
  {
    id: "q9",
    prompt: "What is the purpose of a primary key in a database table?",
    options: [
      "To uniquely identify each row",
      "To encrypt data",
      "To sort columns alphabetically",
      "To store file attachments",
    ],
    correctIndex: 0,
  },
  {
    id: "q10",
    prompt: "Which React hook runs side effects after render?",
    options: ["useState", "useEffect", "useMemo", "useRef"],
    correctIndex: 1,
  },
];

export const PUBLIC_QUESTIONS: PublicExamQuestion[] = EXAM_QUESTIONS.map(
  ({ id, prompt, options }) => ({ id, prompt, options })
);

const QUESTION_ORDER = EXAM_QUESTIONS.map((q) => q.id);

/**
 * Grades answers in question order (q1..q10). Each correct answer = 10 points.
 */
export function gradeAnswers(answers: (number | null)[]): number {
  let correct = 0;
  for (let i = 0; i < EXAM_QUESTIONS.length; i++) {
    const selected = answers[i] ?? null;
    if (selected === EXAM_QUESTIONS[i].correctIndex) {
      correct++;
    }
  }
  return correct * 10;
}

export function getQuestionIds(): string[] {
  return [...QUESTION_ORDER];
}
