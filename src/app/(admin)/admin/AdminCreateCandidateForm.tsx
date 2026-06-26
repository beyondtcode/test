"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  CANDIDATE_SOURCE_OPTIONS,
  EXAM_TYPE_IDS,
  EXAM_TYPE_LABELS,
  type ExamTypeId,
} from "@/lib/exam/exam-types";
import {
  CANDIDATE_TRACK_OPTIONS,
  DEFAULT_CANDIDATE_TRACK,
  type CandidateTrack,
} from "@/lib/monday";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminLabel,
  AdminSectionHeader,
  AdminSelect,
  IconCopy,
  IconUserPlus,
} from "@/components/admin/AdminUI";

type CreateCandidateResponse =
  | {
      link: string;
      token: string;
      warning?: string;
      examInviteSchedule?: {
        status: string;
        error?: string;
      };
      error?: undefined;
    }
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
  const [candidateTrack, setCandidateTrack] = useState<CandidateTrack>(
    DEFAULT_CANDIDATE_TRACK
  );
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledLocalValue);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
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
    setScheduleWarning(null);
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
          candidateTrack,
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
        setScheduleWarning(data.warning ?? null);
        setName("");
        setEmail("");
        setExamTypeId("exam-a");
        setCandidateSource(CANDIDATE_SOURCE_OPTIONS[0]);
        setCustomSource("");
        setCandidateTrack(DEFAULT_CANDIDATE_TRACK);
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
    <AdminCard>
      <AdminSectionHeader
        icon={<IconUserPlus />}
        title="הוספת מועמדת חדשה"
        description="לאחר יצירה יתקבל קישור גישה ייחודי למבחן, שאותו ניתן לשלוח למועמדת."
      />

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <AdminLabel required>שם מועמדת</AdminLabel>
            <AdminInput
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
              placeholder="לדוגמה: רוני כהן"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <AdminLabel required>אימייל</AdminLabel>
            <AdminInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
              placeholder="ronit@example.com"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <AdminLabel>סוג מבחן</AdminLabel>
            <AdminSelect
              value={examTypeId}
              onChange={(e) => setExamTypeId(e.target.value as ExamTypeId)}
              disabled={submitting}
            >
              {EXAM_TYPE_IDS.map((id) => (
                <option key={id} value={id}>
                  {EXAM_TYPE_LABELS[id]}
                </option>
              ))}
            </AdminSelect>
          </label>

          <label className="block">
            <AdminLabel>מקור מועמדת</AdminLabel>
            <AdminSelect
              value={candidateSource}
              onChange={(e) => setCandidateSource(e.target.value)}
              disabled={submitting}
            >
              {CANDIDATE_SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </AdminSelect>
          </label>
        </div>

        <label className="block">
          <AdminLabel required>מסלול נבחן</AdminLabel>
          <AdminSelect
            value={candidateTrack}
            onChange={(e) => setCandidateTrack(e.target.value as CandidateTrack)}
            disabled={submitting}
            required
          >
            {CANDIDATE_TRACK_OPTIONS.map((track) => (
              <option key={track} value={track}>
                {track}
              </option>
            ))}
          </AdminSelect>
        </label>

        {candidateSource === "אחר" && (
          <label className="block">
            <AdminLabel>פירוט מקור</AdminLabel>
            <AdminInput
              type="text"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              disabled={submitting}
              placeholder="לדוגמה: כנס מקצועי"
            />
          </label>
        )}

        <label className="block">
          <AdminLabel required>תאריך ושעה מתוכננים</AdminLabel>
          <AdminInput
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={submitting}
            required
          />
        </label>

        <AdminButton
          type="submit"
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          {submitting ? "יוצרת…" : "הפקת קישור למבחן"}
        </AdminButton>

        {error && <AdminAlert variant="error">{error}</AdminAlert>}
      </form>

      {createdLink && (
        <div className="mt-6 space-y-4">
          {scheduleWarning && (
            <AdminAlert variant="error">{scheduleWarning}</AdminAlert>
          )}
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-l from-brand-50 to-violet-50/80 p-5">
          <p className="text-sm font-bold text-brand-900">הקישור שנוצר</p>
          <p className="mt-1 text-xs text-brand-700/80">
            העתיקי ושלחי למועמדת במייל או בוואטסאפ
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <AdminInput
              type="text"
              readOnly
              value={createdLink}
              className="mt-0 flex-1 font-mono text-xs sm:text-sm"
            />
            <AdminButton
              variant="secondary"
              onClick={() => void copyLink()}
              className="shrink-0"
            >
              <IconCopy />
              {copied ? "הועתק!" : "העתק קישור"}
            </AdminButton>
          </div>
          </div>
        </div>
      )}
    </AdminCard>
  );
}
