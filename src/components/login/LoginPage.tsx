"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ExamBranding } from "@/components/exam/ExamBranding";
import { extractTokenFromInput } from "@/lib/auth/extract-token";

const STEPS = [
  {
    title: "קבלת קישור",
    description: "הקישור האישי נשלח אלייך במייל מהצוות.",
  },
  {
    title: "הדבקת הקישור",
    description: "הדביקי כאן את הקישור המלא או את קוד הגישה.",
  },
  {
    title: "התחלת המבחן",
    description: "לאחר האימות תועברי ישירות למסך המבחן.",
  },
] as const;

export function LoginPage() {
  const router = useRouter();
  const [linkInput, setLinkInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const token = extractTokenFromInput(linkInput);
    if (!token) {
      setError("נא להדביק את הקישור שקיבלת במייל או את קוד הגישה.");
      return;
    }

    setSubmitting(true);
    router.push(`/test?token=${encodeURIComponent(token)}`);
  }

  return (
    <main
      dir="rtl"
      lang="he"
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-50 via-white to-violet-100/80 text-right text-slate-800"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-300/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-fuchsia-300/10 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 text-center">
          <ExamBranding className="justify-center" />
          <p className="mt-3 text-sm font-medium tracking-wide text-brand-700/80">
            מערכת מבחנים למועמדות
          </p>
        </div>

        <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="order-2 lg:order-1">
            <div className="rounded-3xl border border-white/70 bg-white/55 p-6 shadow-xl shadow-brand-200/30 backdrop-blur-md sm:p-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                ברוכים הבאים
              </h1>
              <p className="mt-3 leading-relaxed text-slate-600">
                כדי להתחיל את המבחן הכמותי, הדביקי את הקישור הייחודי שקיבלת
                במייל. המערכת תאמת את הגישה ותעביר אותך למסך ההנחיות לפני תחילת
                המבחן.
              </p>

              <ol className="mt-8 space-y-4">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-4 ring-brand-50">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div className="rounded-3xl border border-brand-100/80 bg-white/85 p-6 shadow-2xl shadow-brand-300/25 backdrop-blur-md sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-300/50">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">כניסה למבחן</h2>
                  <p className="text-sm text-slate-500">קישור אישי בלבד</p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={onSubmit}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    קישור או קוד גישה
                  </span>
                  <input
                    type="text"
                    value={linkInput}
                    onChange={(event) => setLinkInput(event.target.value)}
                    disabled={submitting}
                    placeholder="https://…/test?token=…"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>

                {error && (
                  <p
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-gradient-to-l from-brand-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-300/40 transition hover:from-brand-700 hover:to-violet-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "מאמתים גישה…" : "המשך למבחן"}
                </button>
              </form>

              <p className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs leading-relaxed text-brand-900/80">
                לא קיבלת קישור? בדקי את תיבת הספאם או פני למנהלת הגיוס לקבלת
                קישור חדש.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
