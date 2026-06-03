"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  CANDIDATE_SOURCE_OPTIONS,
  EXAM_TYPE_IDS,
  EXAM_TYPE_LABELS,
  type ExamTypeId,
} from "@/lib/exam/exam-types";

type CreateCandidateResponse =
  | { link: string; token: string; error?: undefined }
  | { link?: undefined; error: string };

const LOCAL_FALLBACK_APP_URL = "http://localhost:3000";

function getClientAppBaseUrl(): string {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || LOCAL_FALLBACK_APP_URL;
  return configuredBaseUrl.replace(/\/+$/, "");
}

function defaultScheduledLocalValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AdminCreateCandidateForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [examTypeId, setExamTypeId] = useState<ExamTypeId>("exam-a");
  const [candidateSource, setCandidateSource] = useState<string>(
    CANDIDATE_SOURCE_OPTIONS[0]
  );
  const [customSource, setCustomSource] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledLocalValue);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const baseUrl = getClientAppBaseUrl();
  const createdLink = createdToken
    ? `${baseUrl}/test?token=${encodeURIComponent(createdToken)}`
    : null;

  const resolvedSource =
    candidateSource === "אחר" ? customSource.trim() : candidateSource;

  const canSubmit = useMemo(() => {
    return (
      name.trim() &&
      email.trim() &&
      resolvedSource &&
      scheduledAt &&
      !submitting
    );
  }, [email, name, resolvedSource, scheduledAt, submitting]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/admin/create-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          examTypeId,
          candidateSource: resolvedSource,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      const data = (await res.json()) as CreateCandidateResponse;
      if (!res.ok) {
        setError("לא ניתן ליצור מועמדת חדשה. " + data.error);
        return;
      }

      if ("token" in data && data.token) {
        setCreatedToken(data.token);
        setName("");
        setEmail("");
        setExamTypeId("exam-a");
        setCandidateSource(CANDIDATE_SOURCE_OPTIONS[0]);
        setCustomSource("");
        setScheduledAt(defaultScheduledLocalValue());
      } else {
        setError("לא התקבל קישור לאחר יצירת מועמדת.");
      }
    } catch {
      setError("אירעה שגיאה במהלך יצירת מועמדת.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = createdLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur">
      <h2 className="text-2xl font-semibold text-slate-900">
        הוספת מועמדת חדשה למערכת
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        לאחר יצירה יתקבל קישור גישה ייחודי למבחן, שאותו ניתן לשלוח
        למועמדת.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-800">שם מועמדת</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="לדוגמה: רוני כהן"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">
              אימייל <span className="text-red-600">*</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="לדוגמה: ronit@example.com"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-800">סוג מבחן</span>
            <select
              value={examTypeId}
              onChange={(e) => setExamTypeId(e.target.value as ExamTypeId)}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {EXAM_TYPE_IDS.map((id) => (
                <option key={id} value={id}>
                  {EXAM_TYPE_LABELS[id]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">מקור מועמדת</span>
            <select
              value={candidateSource}
              onChange={(e) => setCandidateSource(e.target.value)}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {CANDIDATE_SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        </div>

        {candidateSource === "אחר" && (
          <label className="block">
            <span className="text-sm font-medium text-slate-800">פירוט מקור</span>
            <input
              type="text"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="לדוגמה: כנס מקצועי"
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-800">
            תאריך ושעה מתוכננים
          </span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={submitting}
            required
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/60 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "יוצרת…" : "הפקת קישור למבחן"}
        </button>

        {error && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>

      {createdLink && (
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-indigo-900">
                הקישור שנוצר:
              </p>
              <input
                type="text"
                readOnly
                value={createdLink}
                className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-slate-800 shadow-sm outline-none"
              />
            </div>
            <div className="flex items-center justify-start sm:justify-end">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {copied ? "הועתק!" : "העתק קישור"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
