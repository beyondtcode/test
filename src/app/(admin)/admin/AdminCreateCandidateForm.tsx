"use client";

import { useMemo, useState, type FormEvent } from "react";

type CreateCandidateResponse =
  | { link: string; error?: undefined }
  | { link?: undefined; error: string };

export function AdminCreateCandidateForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobPosition, setJobPosition] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(() => {
    return name.trim() && email.trim() && jobPosition.trim() && !submitting;
  }, [email, jobPosition, name, submitting]);

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
          jobPosition,
        }),
      });

      const data = (await res.json()) as CreateCandidateResponse;
      if (!res.ok) {
        setError("לא ניתן ליצור מועמדת חדשה. " + data.error);
        return;
      }

      if ("link" in data && data.link) {
        setCreatedLink(data.link);
        setName("");
        setEmail("");
        setJobPosition("");
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
      // Fallback for older browsers.
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
            <span className="text-sm font-medium text-slate-800">שם</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="לדוגמה: רוני כהן"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">אימייל</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="לדוגמה: ronit@example.com"
              autoComplete="off"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-800">
            משרת/תפקיד
          </span>
          <input
            type="text"
            value={jobPosition}
            onChange={(e) => setJobPosition(e.target.value)}
            disabled={submitting}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            placeholder="לדוגמה: מפתח/ת Frontend"
            autoComplete="off"
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

