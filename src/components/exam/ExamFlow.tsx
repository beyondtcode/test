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

const OPTION_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"] as const;

function ExamCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`exam-animate-in mx-auto w-full max-w-2xl rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-brand-200/30 backdrop-blur-md transition-shadow sm:p-8 ${className}`}
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
      className={`rounded-2xl bg-gradient-to-l from-brand-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-300/40 transition hover:from-brand-700 hover:to-violet-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
      className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
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
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100"
            role="status"
            aria-label="טוען"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
          </div>
          <p className="text-lg font-semibold text-slate-800">טוען את המבחן…</p>
          <p className="mt-1 text-sm text-slate-500">רגע אחד, מאמתים את הגישה שלך</p>
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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-inner">
            <span className="text-3xl font-bold" aria-hidden>
              !
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">אין גישה למבחן</h1>
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
  answeredCount,
  totalQuestions,
}: {
  candidateName: string;
  remainingMs: number;
  timerVisible: boolean;
  onToggleTimer: () => void;
  tabLeaves: number;
  answeredCount: number;
  totalQuestions: number;
}) {
  const isUrgent = remainingMs < 5 * 60 * 1000 && remainingMs > 0;
  const progress =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/90 shadow-sm backdrop-blur-lg">
      <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
              {candidateName}
            </p>
            <p className="text-xs text-slate-500">
              {answeredCount} מתוך {totalQuestions} שאלות נענו
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleTimer}
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              aria-pressed={timerVisible}
              aria-label={timerVisible ? "הסתרת טיימר" : "הצגת טיימר"}
              title={timerVisible ? "הסתרת טיימר" : "הצגת טיימר"}
            >
              {timerVisible ? <IconEye /> : <IconEyeOff />}
            </button>
            <div
              className={`min-w-[5.5rem] rounded-2xl px-4 py-2 text-center font-mono text-lg font-bold tabular-nums shadow-inner transition-colors ${
                isUrgent
                  ? "bg-red-50 text-red-600 ring-2 ring-red-200"
                  : "bg-gradient-to-l from-brand-50 to-violet-50 text-slate-800"
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
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-l from-brand-500 to-violet-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="התקדמות במבחן"
          />
        </div>
      </div>
      {tabLeaves > 0 && (
        <p className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          אזהרה: יציאה מהטאב {tabLeaves} מתוך {TAB_LEAVE_LIMIT}
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
    const durationMinutes = Math.round(examDurationMs / 60000);
    const rules = [
      { text: `יש לך מגבלת זמן קשיחה של ${durationMinutes} דקות.`, type: "normal" as const },
      { text: "לא ניתן להשהות את הטיימר לאחר תחילת המבחן.", type: "normal" as const },
      { text: "המבחן יוגש אוטומטית עם סיום הזמן.", type: "normal" as const },
      { text: "אסור להשתמש במחשבון במהלך המבחן — אין להשתמש בו כלל.", type: "warning" as const },
      { text: "חשוב מאוד: אסור לצאת ממסך המבחן. יציאה אחת בלבד תחסום את המבחן באופן מיידי.", type: "warning" as const },
      { text: "ההתקדמות נשמרת מקומית במקרה של רענון הדף.", type: "normal" as const },
    ];

    return (
      <ExamShell>
        <div className="px-4 pb-12 pt-2">
          <ExamCard className="mt-4">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-2xl text-white shadow-lg shadow-brand-300/40">
                👋
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
                  {welcomeHeading(candidate.name, candidate.examTypeLabel)}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  קראי את הכללים לפני תחילת המבחן
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-gradient-to-l from-brand-50/80 to-violet-50/50 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-brand-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-sm">
                  📋
                </span>
                כללי המבחן
              </h2>
              <ul className="mt-4 space-y-3">
                {rules.map((rule) => (
                  <li
                    key={rule.text}
                    className={`flex gap-3 rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                      rule.type === "warning"
                        ? "border border-red-200 bg-red-50 font-semibold text-red-800"
                        : "text-slate-700"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        rule.type === "warning"
                          ? "bg-red-200 text-red-700"
                          : "bg-brand-200 text-brand-700"
                      }`}
                    >
                      {rule.type === "warning" ? "!" : "✓"}
                    </span>
                    {rule.text}
                  </li>
                ))}
              </ul>
            </div>

            {errorMessage && (
              <p
                className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                בלחיצה על הכפתור המבחן יתחיל והטיימר יופעל
              </p>
              <PrimaryButton
                onClick={() => void handleStartExam()}
                disabled={starting}
                className="w-full sm:w-auto"
              >
                {starting ? "מתחילים…" : "התחלת המבחן ←"}
              </PrimaryButton>
            </div>
          </ExamCard>
        </div>
      </ExamShell>
    );
  }

  const answeredCount = Object.values(answers).filter((a) => a !== null).length;

  return (
    <ExamShell showLogo={false}>
      <div className="border-b border-white/60 bg-white/70 px-4 py-4 backdrop-blur-md">
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
        answeredCount={answeredCount}
        totalQuestions={questions.length}
      />

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-32">
        {questions.map((question, index) => {
          const isAnswered = answers[question.id] !== null;
          return (
            <fieldset
              key={question.id}
              disabled={submitting}
              className={`exam-animate-in rounded-3xl border bg-white/90 p-5 shadow-lg backdrop-blur-sm transition disabled:opacity-60 sm:p-6 ${
                isAnswered
                  ? "border-brand-200 shadow-brand-100/50"
                  : "border-white/80 shadow-slate-200/40"
              }`}
              style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
            >
              <legend className="mb-4 flex w-full items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white shadow-md">
                  {index + 1}
                </span>
                <span className="pt-1 text-base font-bold leading-relaxed text-slate-900 sm:text-lg">
                  {question.prompt}
                </span>
              </legend>
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[question.id] === optionIndex;
                  const letter =
                    OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1);
                  return (
                    <label
                      key={optionIndex}
                      className={`group flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3.5 transition ${
                        selected
                          ? "border-brand-400 bg-gradient-to-l from-brand-50 to-violet-50 shadow-sm ring-2 ring-brand-200/60"
                          : "border-transparent bg-slate-50/80 hover:border-slate-200 hover:bg-white"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition ${
                          selected
                            ? "bg-gradient-to-br from-brand-500 to-violet-600 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-200 group-hover:ring-brand-200"
                        }`}
                      >
                        {letter}
                      </span>
                      <input
                        type="radio"
                        name={question.id}
                        checked={selected}
                        onChange={() =>
                          handleAnswerChange(question.id, optionIndex)
                        }
                        className="sr-only"
                      />
                      <span className="text-sm leading-relaxed text-slate-800 sm:text-base">
                        {option}
                      </span>
                      {selected && (
                        <span className="mr-auto text-brand-600" aria-hidden>
                          ✓
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/60 bg-white/95 px-4 py-4 shadow-[0_-8px_30px_rgba(147,51,234,0.08)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="hidden text-sm text-slate-500 sm:block">
            {answeredCount}/{questions.length} שאלות נענו
          </p>
          <PrimaryButton
            onClick={() => setShowSubmitModal(true)}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "שולחת…" : "הגשת המבחן"}
          </PrimaryButton>
        </div>
      </footer>

      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
        >
          <div className="exam-animate-in w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl">
              ⚠️
            </div>
            <h2
              id="submit-modal-title"
              className="text-xl font-bold text-slate-900"
            >
              להגיש את המבחן?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              לא ניתן לשנות תשובות לאחר ההגשה.
              {answeredCount < questions.length && (
                <>
                  {" "}
                  ענית על {answeredCount} מתוך {questions.length} שאלות.
                </>
              )}
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
