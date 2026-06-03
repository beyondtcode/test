import type { ExamTypeId } from "./exam-types";
import type { PublicExamQuestion } from "./questions";

export const EXAM_SESSION_KEY = "exam_session_v1";

export type ExamPhase = "welcome" | "exam" | "submitted";

export type ExamSession = {
  token: string;
  itemId: string;
  name: string;
  jobPosition?: string;
  examTypeId?: ExamTypeId;
  examTypeLabel?: string;
  candidateSource?: string;
  endsAt: number;
  answers: Record<string, number | null>;
  tabLeaves: number;
  phase: ExamPhase;
  questions?: PublicExamQuestion[];
  durationMs?: number;
};

export function loadExamSession(): ExamSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(EXAM_SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ExamSession;
  } catch {
    return null;
  }
}

export function saveExamSession(session: ExamSession): void {
  localStorage.setItem(EXAM_SESSION_KEY, JSON.stringify(session));
}

export function clearExamSession(): void {
  localStorage.removeItem(EXAM_SESSION_KEY);
}

export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function answersRecordToArray(
  questions: PublicExamQuestion[],
  answers: Record<string, number | null>
): (number | null)[] {
  return questions.map((q) => answers[q.id] ?? null);
}
