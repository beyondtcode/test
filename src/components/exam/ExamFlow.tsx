"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ExamTypeId } from "@/lib/exam/exam-types";
import { EXAM_LOAD_ERROR_HE } from "@/lib/exam/errors";
import { EXAM_DURATION_MS } from "@/lib/exam/questions";
import type { PublicExamQuestion } from "@/lib/exam/questions";
import {
  answersRecordToArray,
  clearExamSession,
  formatTimeRemaining,
  loadExamSession,
  saveExamSession,
  type ExamSession,
} from "@/lib/exam/session";
import { ExamBranding } from "./ExamBranding";
import { IconEye, IconEyeOff } from "./ExamIcons";
import { ExamShell } from "./ExamShell";

type ViewState = "loading" | "welcome" | "exam" | "submitted" | "error";

type AuthSuccess = {
  itemId: string;
  name: string;
  email: string;
  jobPosition?: string;
  examTypeId: ExamTypeId;
  examTypeLabel: string;
  candidateSource?: string;
};

const TAB_LEAVE_LIMIT = 1;
const FOCUS_DEBOUNCE_MS = 500;
const ONE_LEAVE_BLOCK_MESSAGE =
  "עזבת את מסך המבחן. לפי הנהלים, יציאה אחת בלבד חוסמת את המבחן באופן מיידי.";

const ACCESS_DENIED_MESSAGE =
  "אין לך גישה למבחן זה. ייתכן שהקישור פג תוקף, המבחן כבר הוגש, או שגישתך נחסמה. נא לפנות למנהל הגיוס לבירור המשך התהליך.";

const THANK_YOU_MESSAGE =
  "תודה רבה! המבחן הוגש בהצלחה. אנחנו מעריכים את זמנך והשקעתך. נציג מטעמנו יבחן את התוצאות ונחזור אלייך בהקדם עם עדכון לגבי המשך תהליך המיון.";

function welcomeHeading(name: string, examTypeLabel: string): string {
  const label = examTypeLabel.trim();
  if (label) {
    return `שלום ${name}! ברוכה הבאה ל${label}.`;
  }
  return `שלום ${name}! ברוכה הבאה למבחן הטכני שלך.`;
}

function ExamCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/50 transition-shadow sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200/60 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}

function LoadingView() {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <ExamCard className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"
            role="status"
            aria-label="טוען"
          />
          <p className="text-slate-600">טוען את המבחן…</p>
        </ExamCard>
      </div>
    </ExamShell>
  );
}

function AccessDeniedView() {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <ExamCard className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <span className="text-2xl font-bold" aria-hidden>
              !
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">אין גישה למבחן</h1>
          <p className="mt-4 leading-relaxed text-slate-600">
            {ACCESS_DENIED_MESSAGE}
          </p>
        </ExamCard>
      </div>
    </ExamShell>
  );
}

function ThankYouView() {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <ExamCard className="text-center">
          <div
            className="exam-checkmark mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"
            aria-hidden
          >
            <svg
              className="h-12 w-12 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                className="exam-check-path"
                d="M6 12.5 10 16.5 18 8"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">תודה רבה!</h1>
          <p className="mt-4 leading-relaxed text-slate-600">
            {THANK_YOU_MESSAGE}
          </p>
        </ExamCard>
      </div>
      <style jsx>{`
        .exam-checkmark {
          animation: scale-in 0.5s ease-out;
        }
        .exam-check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: draw-check 0.6s ease-out 0.25s forwards;
        }
        @keyframes scale-in {
          from {
            transform: scale(0.6);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </ExamShell>
  );
}

function ExamStickyHeader({
  candidateName,
  remainingMs,
  timerVisible,
  onToggleTimer,
  tabLeaves,
}: {
  candidateName: string;
  remainingMs: number;
  timerVisible: boolean;
  onToggleTimer: () => void;
  tabLeaves: number;
}) {
  const isUrgent = remainingMs < 5 * 60 * 1000 && remainingMs > 0;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="truncate text-sm font-semibold text-slate-800 sm:text-base">
          מועמדת: <span className="text-indigo-700">{candidateName}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleTimer}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-pressed={timerVisible}
            aria-label={
              timerVisible ? "הסתרת טיימר" : "הצגת טיימר"
            }
            title={timerVisible ? "הסתרת טיימר" : "הצגת טיימר"}
          >
            {timerVisible ? <IconEye /> : <IconEyeOff />}
          </button>
          <div
            className={`min-w-[5.5rem] rounded-lg bg-slate-100 px-3 py-1.5 text-center font-mono text-lg tabular-nums transition-colors ${
              isUrgent ? "bg-red-50 text-red-600" : "text-slate-800"
            }`}
            aria-live="polite"
            aria-label="זמן שנותר"
          >
            {timerVisible ? (
              formatTimeRemaining(remainingMs)
            ) : (
              <span className="tracking-widest text-slate-400">••:••</span>
            )}
          </div>
        </div>
      </div>
      {tabLeaves > 0 && (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
          יציאה מהטאב: {tabLeaves} מתוך {TAB_LEAVE_LIMIT}
        </p>
      )}
    </header>
  );
}

export function ExamFlow() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";

  const [view, setView] = useState<ViewState>("loading");
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [candidate, setCandidate] = useState<AuthSuccess | null>(null);
  const [token, setToken] = useState("");
  const [questions, setQuestions] = useState<PublicExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [tabLeaves, setTabLeaves] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [timerVisible, setTimerVisible] = useState(true);
  const [examDurationMs, setExamDurationMs] = useState(EXAM_DURATION_MS);

  const sessionRef = useRef<ExamSession | null>(null);
  const lastFocusEventRef = useRef(0);
  const submitInFlightRef = useRef(false);

  const persistSession = useCallback((partial: Partial<ExamSession>) => {
    const base = sessionRef.current;
    if (!base) {
      return;
    }
    const next: ExamSession = { ...base, ...partial };
    sessionRef.current = next;
    saveExamSession(next);
  }, []);

  const submitExam = useCallback(
    async (tabLeavesCount: number, forced = false) => {
      if (submitInFlightRef.current) {
        return;
      }
      const session = sessionRef.current;
      if (!session || !session.questions?.length) {
        return;
      }

      submitInFlightRef.current = true;
      setSubmitting(true);

      try {
        const response = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: session.itemId,
            token: session.token,
            answers: answersRecordToArray(session.questions, session.answers),
            tabLeavesCount,
            candidateSource: session.candidateSource,
            examTypeId: session.examTypeId,
          }),
        });

        const data = (await response.json()) as {
          score?: number;
          status?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "שליחת המבחן נכשלה");
        }

        clearExamSession();
        sessionRef.current = null;
        setView("submitted");
      } catch (err) {
        if (!forced) {
          setAccessDenied(false);
          setErrorMessage(
            err instanceof Error ? err.message : "שליחת המבחן נכשלה"
          );
          setView("error");
        }
      } finally {
        setSubmitting(false);
        submitInFlightRef.current = false;
      }
    },
    []
  );

  const handleTabLeave = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.phase !== "exam" || submitting) {
      return;
    }

    const now = Date.now();
    if (now - lastFocusEventRef.current < FOCUS_DEBOUNCE_MS) {
      return;
    }
    lastFocusEventRef.current = now;

    const nextTabLeaves = session.tabLeaves + 1;
    setTabLeaves(nextTabLeaves);
    persistSession({ tabLeaves: nextTabLeaves });

    if (nextTabLeaves >= TAB_LEAVE_LIMIT) {
      window.alert(ONE_LEAVE_BLOCK_MESSAGE);
      void submitExam(nextTabLeaves, true);
      return;
    }

  }, [persistSession, submitExam, submitting]);

  useEffect(() => {
    if (view !== "exam" || !endsAt) {
      return;
    }

    const tick = () => {
      const remaining = endsAt - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0 && !submitInFlightRef.current) {
        void submitExam(tabLeaves, true);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [view, endsAt, tabLeaves, submitExam]);

  useEffect(() => {
    if (view !== "exam") {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleTabLeave();
      }
    };

    const onBlur = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      handleTabLeave();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [view, handleTabLeave]);

  useEffect(() => {
    async function init() {
      const stored = loadExamSession();

      if (stored?.phase === "exam" && stored.endsAt > Date.now()) {
        sessionRef.current = stored;
        setToken(stored.token);
        setCandidate({
          itemId: stored.itemId,
          name: stored.name,
          email: "",
          jobPosition: stored.jobPosition ?? "",
          examTypeId: stored.examTypeId ?? "exam-a",
          examTypeLabel: stored.examTypeLabel ?? "",
          candidateSource: stored.candidateSource,
        });
        setQuestions(stored.questions ?? []);
        setAnswers(stored.answers);
        setTabLeaves(stored.tabLeaves);
        setEndsAt(stored.endsAt);
        setRemainingMs(stored.endsAt - Date.now());
        setExamDurationMs(stored.durationMs ?? EXAM_DURATION_MS);
        setView("exam");
        return;
      }

      if (stored?.phase === "welcome" && stored.token) {
        sessionRef.current = stored;
        setToken(stored.token);
        setCandidate({
          itemId: stored.itemId,
          name: stored.name,
          email: "",
          jobPosition: stored.jobPosition ?? "",
          examTypeId: stored.examTypeId ?? "exam-a",
          examTypeLabel: stored.examTypeLabel ?? "",
          candidateSource: stored.candidateSource,
        });
        setExamDurationMs(stored.durationMs ?? EXAM_DURATION_MS);
        setView("welcome");
        return;
      }

      const authToken = tokenFromUrl || stored?.token;
      if (!authToken) {
        setAccessDenied(false);
        setErrorMessage(EXAM_LOAD_ERROR_HE);
        setView("error");
        return;
      }

      try {
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: authToken }),
        });

        const data = (await response.json()) as AuthSuccess & {
          error?: string;
        };

        if (!response.ok || !data.examTypeId) {
          setAccessDenied(false);
          setErrorMessage(data.error ?? EXAM_LOAD_ERROR_HE);
          setView("error");
          return;
        }

        const session: ExamSession = {
          token: authToken,
          itemId: data.itemId,
          name: data.name,
          jobPosition: data.jobPosition ?? "",
          examTypeId: data.examTypeId,
          examTypeLabel: data.examTypeLabel,
          candidateSource: data.candidateSource,
          endsAt: 0,
          answers: {},
          tabLeaves: 0,
          phase: "welcome",
          durationMs: EXAM_DURATION_MS,
        };
        sessionRef.current = session;
        saveExamSession(session);
        setToken(authToken);
        setCandidate({
          ...data,
          jobPosition: data.jobPosition ?? "",
        });
        setView("welcome");
      } catch {
        setAccessDenied(false);
        setErrorMessage(EXAM_LOAD_ERROR_HE);
        setView("error");
      }
    }

    void init();
  }, [tokenFromUrl]);

  const handleStartExam = async () => {
    if (!candidate || !token || starting) {
      return;
    }

    setStarting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: candidate.itemId, token }),
      });

      const data = (await response.json()) as {
        questions?: PublicExamQuestion[];
        durationMs?: number;
        error?: string;
      };

      if (!response.ok) {
        setAccessDenied(false);
        setErrorMessage(data.error ?? EXAM_LOAD_ERROR_HE);
        setView("error");
        return;
      }

      const examQuestions = data.questions ?? [];
      const durationMs = data.durationMs ?? EXAM_DURATION_MS;
      const newEndsAt = Date.now() + durationMs;
      const initialAnswers: Record<string, number | null> = {};
      for (const q of examQuestions) {
        initialAnswers[q.id] = null;
      }

      const session: ExamSession = {
        token,
        itemId: candidate.itemId,
        name: candidate.name,
        jobPosition: candidate.jobPosition,
        examTypeId: candidate.examTypeId,
        examTypeLabel: candidate.examTypeLabel,
        candidateSource: candidate.candidateSource,
        endsAt: newEndsAt,
        answers: initialAnswers,
        tabLeaves: 0,
        phase: "exam",
        questions: examQuestions,
        durationMs,
      };

      sessionRef.current = session;
      saveExamSession(session);
      setQuestions(examQuestions);
      setAnswers(initialAnswers);
      setTabLeaves(0);
      setEndsAt(newEndsAt);
      setRemainingMs(durationMs);
      setExamDurationMs(durationMs);
      setView("exam");
    } catch {
      setAccessDenied(false);
      setErrorMessage(EXAM_LOAD_ERROR_HE);
      setView("error");
    } finally {
      setStarting(false);
    }
  };

  const handleAnswerChange = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: optionIndex };
      persistSession({ answers: next });
      return next;
    });
  };

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    void submitExam(tabLeaves);
  };

  if (view === "loading") {
    return <LoadingView />;
  }

  if (view === "error") {
    if (accessDenied) {
      return <AccessDeniedView />;
    }
    return (
      <ExamShell>
        <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
          <ExamCard className="text-center">
            <h1 className="text-xl font-bold text-slate-900">אירעה שגיאה</h1>
            <p className="mt-4 leading-relaxed text-slate-600">
              {errorMessage || ACCESS_DENIED_MESSAGE}
            </p>
          </ExamCard>
        </div>
      </ExamShell>
    );
  }

  if (view === "submitted") {
    return <ThankYouView />;
  }

  if (view === "welcome" && candidate) {
    return (
      <ExamShell>
        <div className="px-4 pb-12">
          <ExamCard className="mt-4">
            <h1 className="text-2xl font-bold leading-snug text-slate-900">
              {welcomeHeading(candidate.name, candidate.examTypeLabel)}
            </h1>
            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
              <h2 className="text-lg font-semibold text-indigo-900">
                כללי המבחן
              </h2>
              <ul className="mt-3 list-inside list-disc space-y-2.5 text-sm leading-relaxed text-slate-700">
                <li>
                  יש לך מגבלת זמן קשיחה של{" "}
                  {Math.round(examDurationMs / 60000)} דקות.
                </li>
                <li>לא ניתן להשהות את הטיימר לאחר תחילת המבחן.</li>
                <li>המבחן יוגש אוטומטית עם סיום הזמן.</li>
                <li className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-800">
                  אסור להשתמש במחשבון במהלך המבחן — אין להשתמש בו כלל.
                </li>
                <li className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-800">
                  חשוב מאוד: אסור לצאת ממסך המבחן. יציאה אחת בלבד תחסום את
                  המבחן באופן מיידי.
                </li>
                <li>ההתקדמות נשמרת מקומית במקרה של רענון הדף.</li>
              </ul>
            </div>
            {errorMessage && (
              <p
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </p>
            )}
            <div className="mt-8 flex justify-start">
              <PrimaryButton
                onClick={() => void handleStartExam()}
                disabled={starting}
              >
                {starting ? "מתחילים…" : "התחלת המבחן"}
              </PrimaryButton>
            </div>
          </ExamCard>
        </div>
      </ExamShell>
    );
  }

  return (
    <ExamShell showLogo={false}>
      <div className="border-b border-slate-100 bg-white/80 px-4 py-3">
        <div className="mx-auto flex max-w-3xl justify-center">
          <ExamBranding />
        </div>
      </div>

      <ExamStickyHeader
        candidateName={candidate?.name ?? ""}
        remainingMs={remainingMs}
        timerVisible={timerVisible}
        onToggleTimer={() => setTimerVisible((v) => !v)}
        tabLeaves={tabLeaves}
      />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-28">
        {questions.map((question, index) => (
          <fieldset
            key={question.id}
            disabled={submitting}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-100/80 transition hover:shadow-lg disabled:opacity-60"
          >
            <legend className="mb-4 text-base font-semibold leading-relaxed text-slate-900">
              {index + 1}. {question.prompt}
            </legend>
            <div className="space-y-1">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id] === optionIndex;
                return (
                  <label
                    key={optionIndex}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                      selected
                        ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={selected}
                      onChange={() =>
                        handleAnswerChange(question.id, optionIndex)
                      }
                      className="h-4 w-4 shrink-0 accent-indigo-600"
                    />
                    <span className="text-sm leading-relaxed text-slate-800">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl justify-start">
          <PrimaryButton
            onClick={() => setShowSubmitModal(true)}
            disabled={submitting}
          >
            {submitting ? "שולחת…" : "הגשת המבחן"}
          </PrimaryButton>
        </div>
      </footer>

      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2
              id="submit-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              להגיש את המבחן?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              לא ניתן לשנות תשובות לאחר ההגשה. האם להמשיך?
            </p>
            <div className="mt-6 flex flex-wrap justify-start gap-3">
              <SecondaryButton onClick={() => setShowSubmitModal(false)}>
                ביטול
              </SecondaryButton>
              <PrimaryButton onClick={handleConfirmSubmit} className="px-5 py-2.5">
                כן, הגשה
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </ExamShell>
  );
}
