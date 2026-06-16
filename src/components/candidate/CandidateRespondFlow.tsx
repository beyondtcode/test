"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExamShell } from "@/components/exam/ExamShell";
import {
  RESPOND_TIME_SLOTS,
  type RespondTimeSlot,
} from "@/lib/candidate/respond-time-slots";

type ViewState = "loading" | "form" | "submitting" | "success" | "error";

const SUCCESS_MESSAGE =
  "השעה נקבעה בהצלחה! המבחן יישלח אלייך במייל במועד הנבחר.";

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

function LoadingView({ message }: { message: string }) {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <RespondCard className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
            role="status"
            aria-label="טוען"
          />
          <p className="text-slate-600">{message}</p>
        </RespondCard>
      </div>
    </ExamShell>
  );
}

function PageHeader() {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
        בחירת שעה למבחן כמותי
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        בחרי את שעת המבחן המתאימה לך
      </p>
    </div>
  );
}

function TimeSlotButton({
  slot,
  selected,
  disabled,
  onSelect,
}: {
  slot: RespondTimeSlot;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`group flex flex-col items-center justify-center rounded-xl border-2 px-4 py-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-100"
          : "border-slate-200 bg-slate-50/80 hover:border-brand-300 hover:bg-brand-50/50"
      }`}
    >
      <svg
        className={`mb-2 h-7 w-7 transition-colors ${
          selected ? "text-brand-600" : "text-slate-400 group-hover:text-brand-500"
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      <span
        dir="ltr"
        className={`text-xl font-bold tabular-nums ${
          selected ? "text-brand-700" : "text-slate-700"
        }`}
      >
        {slot}
      </span>
    </button>
  );
}

function SuccessView() {
  return (
    <ExamShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4 pb-12">
        <RespondCard className="text-center">
          <div
            className="respond-icon mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"
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
                className="respond-check-path"
                d="M6 12.5 10 16.5 18 8"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">השעה נקבעה</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            {SUCCESS_MESSAGE}
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
          <h1 className="text-xl font-bold text-slate-900">לא ניתן להמשיך</h1>
          <p className="mt-4 leading-relaxed text-slate-600">{message}</p>
        </RespondCard>
      </div>
    </ExamShell>
  );
}

export function CandidateRespondFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [scheduledDateLabel, setScheduledDateLabel] = useState("");
  const [selectedTime, setSelectedTime] = useState<RespondTimeSlot | "">("");
  const [view, setView] = useState<ViewState>(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "הקישור אינו תקין. נא לפנות למנהל הגיוס."
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadScheduledDate() {
      try {
        const response = await fetch(
          `/api/candidate/respond?token=${encodeURIComponent(token)}`
        );
        const data = (await response.json().catch(() => ({}))) as {
          scheduledDateLabel?: string;
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

        if (!data.scheduledDateLabel) {
          setErrorMessage("לא הוגדר תאריך מבחן. נא לפנות למנהל הגיוס.");
          setView("error");
          return;
        }

        setScheduledDateLabel(data.scheduledDateLabel);
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

    void loadScheduledDate();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const canSubmit = Boolean(selectedTime);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!token || !selectedTime) {
      return;
    }

    setView("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/candidate/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          time: selectedTime,
        }),
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
        <RespondCard>
          <PageHeader />

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-4 text-center">
              <p className="text-base font-medium leading-relaxed text-slate-800 sm:text-lg">
                {scheduledDateLabel}
              </p>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">
                שעת המבחן
              </p>
              <div className="grid grid-cols-3 gap-3">
                {RESPOND_TIME_SLOTS.map((slot) => (
                  <TimeSlotButton
                    key={slot}
                    slot={slot}
                    selected={selectedTime === slot}
                    disabled={view === "submitting"}
                    onSelect={() => setSelectedTime(slot)}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || view === "submitting"}
              className="w-full rounded-xl bg-brand-600 px-6 py-4 text-lg font-semibold text-white shadow-md shadow-brand-200/60 transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {view === "submitting" ? "שומרים את הבחירה…" : "אישור השעה"}
            </button>
          </form>
        </RespondCard>
      </div>
    </ExamShell>
  );
}
