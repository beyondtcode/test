"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExamShell } from "@/components/exam/ExamShell";

type ViewState = "loading" | "form" | "submitting" | "success" | "error";

const SUCCESS_MESSAGE =
  "המועד אושר בהצלחה! הקישור למבחן יישלח אליך במייל במועד הנקוב.";

function ConfirmCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

function LoadingView({ message }: { message: string }) {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <ConfirmCard className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
            role="status"
            aria-label="טוען"
          />
          <p className="text-slate-600">{message}</p>
        </ConfirmCard>
      </div>
    </ExamShell>
  );
}

function SuccessView() {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <ConfirmCard className="text-center">
          <div
            className="confirm-icon mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"
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
                className="confirm-check-path"
                d="M6 12.5 10 16.5 18 8"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">המועד אושר</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            {SUCCESS_MESSAGE}
          </p>
        </ConfirmCard>
      </div>
      <style jsx>{`
        .confirm-icon {
          animation: confirm-scale-in 0.5s ease-out;
        }
        .confirm-check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: confirm-draw 0.6s ease-out 0.25s forwards;
        }
        @keyframes confirm-scale-in {
          from {
            transform: scale(0.6);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes confirm-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </ExamShell>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <ConfirmCard className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <span className="text-2xl font-bold" aria-hidden>
              !
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">לא ניתן להמשיך</h1>
          <p className="mt-4 leading-relaxed text-slate-600">{message}</p>
        </ConfirmCard>
      </div>
    </ExamShell>
  );
}

export function CandidateExamConfirmFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [name, setName] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [view, setView] = useState<ViewState>(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "הקישור אינו תקין. נא לפנות למנהל הגיוס."
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadConfirmDetails() {
      try {
        const response = await fetch(
          `/api/candidate/confirm?token=${encodeURIComponent(token)}`
        );
        const data = (await response.json().catch(() => ({}))) as {
          name?: string;
          dateLabel?: string;
          timeLabel?: string;
          alreadyConfirmed?: boolean;
          error?: string;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setErrorMessage(
            typeof data.error === "string"
              ? data.error
              : "אירעה שגיאה בטעינת פרטי המבחן."
          );
          setView("error");
          return;
        }

        if (!data.name || !data.dateLabel || !data.timeLabel) {
          setErrorMessage("לא הוגדר תאריך מבחן. נא לפנות למנהל הגיוס.");
          setView("error");
          return;
        }

        setName(data.name);
        setDateLabel(data.dateLabel);
        setTimeLabel(data.timeLabel);

        if (data.alreadyConfirmed) {
          setView("success");
          return;
        }

        setView("form");
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "אירעה שגיאה בחיבור לשרת. נא לנסות שוב מאוחר יותר."
          );
          setView("error");
        }
      }
    }

    void loadConfirmDetails();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleConfirm() {
    if (!token) {
      return;
    }

    setView("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/candidate/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(
          typeof data.error === "string"
            ? data.error
            : "אירעה שגיאה. נא לנסות שוב או לפנות למנהל הגיוס."
        );
        setView("error");
        return;
      }

      setView("success");
    } catch {
      setErrorMessage(
        "אירעה שגיאה בחיבור לשרת. נא לנסות שוב מאוחר יותר."
      );
      setView("error");
    }
  }

  if (view === "loading") {
    return <LoadingView message="טוענים את פרטי המבחן…" />;
  }

  if (view === "error") {
    return <ErrorView message={errorMessage} />;
  }

  if (view === "success") {
    return <SuccessView />;
  }

  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-start justify-center px-4 pb-12 pt-2 sm:pt-4">
        <ConfirmCard>
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
              אישור הגעה למבחן
            </h1>
          </div>

          <div className="space-y-8">
            <p className="text-center text-base leading-relaxed text-slate-800 sm:text-lg">
              היי {name}, נקבע עבורך מועד למבחן בתאריך{" "}
              <span className="font-semibold">{dateLabel}</span> בשעה{" "}
              <span dir="ltr" className="font-semibold tabular-nums">
                {timeLabel}
              </span>
              . נא אשר את הגעתך.
            </p>

            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={view === "submitting"}
              className="w-full rounded-xl bg-brand-600 px-6 py-4 text-lg font-semibold text-white shadow-md shadow-brand-200/60 transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {view === "submitting" ? "שומרים את האישור…" : "מאשר הגעה למבחן"}
            </button>
          </div>
        </ConfirmCard>
      </div>
    </ExamShell>
  );
}
