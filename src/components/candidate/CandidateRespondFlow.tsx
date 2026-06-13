"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExamShell } from "@/components/exam/ExamShell";

type RespondChoice = "approve" | "postpone";
type ViewState = "loading" | "success" | "error";

const APPROVE_MESSAGE =
  "מועד המבחן אושר בהצלחה! המבחן יישלח אלייך במייל במועד המתוכנן. בהצלחה!";

const POSTPONE_MESSAGE =
  "בקשתך לדחיית המבחן התקבלה. נציג גיוס יקרא את העדכון ויצור איתך קשר לתיאום מועד חדש. תודה!";

function RespondCard({
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

function LoadingView() {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <RespondCard className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
            role="status"
            aria-label="טוען"
          />
          <p className="text-slate-600">מעדכנים את תשובתך…</p>
        </RespondCard>
      </div>
    </ExamShell>
  );
}

function SuccessView({
  choice,
  message,
}: {
  choice: RespondChoice;
  message: string;
}) {
  const isApprove = choice === "approve";

  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <RespondCard className="text-center">
          <div
            className={`respond-icon mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
              isApprove ? "bg-emerald-50" : "bg-brand-50"
            }`}
            aria-hidden
          >
            {isApprove ? (
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
                  className="respond-check-path"
                  d="M6 12.5 10 16.5 18 8"
                />
              </svg>
            ) : (
              <svg
                className="h-12 w-12 text-brand-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
                <path className="respond-calendar-path" d="M12 14v4M10 16h4" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isApprove ? "מועד המבחן אושר" : "בקשת הדחייה התקבלה"}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            {message}
          </p>
        </RespondCard>
      </div>
      <style jsx>{`
        .respond-icon {
          animation: respond-scale-in 0.5s ease-out;
        }
        .respond-check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: respond-draw 0.6s ease-out 0.25s forwards;
        }
        .respond-calendar-path {
          opacity: 0;
          animation: respond-fade-in 0.4s ease-out 0.35s forwards;
        }
        @keyframes respond-scale-in {
          from {
            transform: scale(0.6);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes respond-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes respond-fade-in {
          to {
            opacity: 1;
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
        <RespondCard className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <span className="text-2xl font-bold" aria-hidden>
              !
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">לא ניתן לעדכן</h1>
          <p className="mt-4 leading-relaxed text-slate-600">{message}</p>
        </RespondCard>
      </div>
    </ExamShell>
  );
}

export function CandidateRespondFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const choiceParam = searchParams.get("choice")?.trim() ?? "";
  const choice: RespondChoice | null =
    choiceParam === "approve" || choiceParam === "postpone"
      ? choiceParam
      : null;

  const [view, setView] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [successChoice, setSuccessChoice] = useState<RespondChoice | null>(
    null
  );

  useEffect(() => {
    if (!token || !choice) {
      setErrorMessage("הקישור אינו תקין. נא לפנות למנהל הגיוס.");
      setView("error");
      return;
    }

    let cancelled = false;

    async function submitResponse() {
      try {
        const response = await fetch("/api/candidate/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, choice }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setErrorMessage(
            typeof data.error === "string"
              ? data.error
              : "אירעה שגיאה. נא לנסות שוב או לפנות למנהל הגיוס."
          );
          setView("error");
          return;
        }

        setSuccessChoice(choice);
        setView("success");
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "אירעה שגיאה בחיבור לשרת. נא לנסות שוב מאוחר יותר."
          );
          setView("error");
        }
      }
    }

    void submitResponse();

    return () => {
      cancelled = true;
    };
  }, [token, choice]);

  if (view === "loading") {
    return <LoadingView />;
  }

  if (view === "error") {
    return <ErrorView message={errorMessage} />;
  }

  if (view === "success" && successChoice) {
    const message =
      successChoice === "approve" ? APPROVE_MESSAGE : POSTPONE_MESSAGE;
    return <SuccessView choice={successChoice} message={message} />;
  }

  return <LoadingView />;
}
