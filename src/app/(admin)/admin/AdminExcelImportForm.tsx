"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  CANDIDATE_TRACK_OPTIONS,
  DEFAULT_CANDIDATE_TRACK,
  type CandidateTrack,
} from "@/lib/monday";
import { rememberImportedGroupForSchedule } from "./AdminBulkScheduleForm";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminLabel,
  AdminSectionHeader,
  AdminSelect,
  IconUpload,
} from "@/components/admin/AdminUI";

type ImportRowError = {
  row: number;
  message: string;
  name?: string;
};

type ImportSuccessResponse = {
  groupId: string;
  groupName: string;
  imported: number;
  failed: number;
  totalRows: number;
  errors: ImportRowError[];
  scheduledAt?: string;
  scheduleUpdated?: number;
  scheduleFailed?: number;
  scheduleErrors?: Array<{ itemId: string; name?: string; message: string }>;
  error?: undefined;
};

type ImportErrorResponse = {
  error: string;
};

const ACCEPT = ".xlsx,.xls,.csv";

function defaultScheduledLocalValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AdminExcelImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [candidateTrack, setCandidateTrack] = useState<CandidateTrack>(
    DEFAULT_CANDIDATE_TRACK
  );
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledLocalValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSuccessResponse | null>(null);

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const pickFile = useCallback((file: File | null) => {
    if (!file) {
      return;
    }
    const lower = file.name.toLowerCase();
    const valid =
      lower.endsWith(".xlsx") ||
      lower.endsWith(".xls") ||
      lower.endsWith(".csv");
    if (!valid) {
      setError("סוג קובץ לא נתמך. ניתן להעלות קבצי .xlsx, .xls או .csv בלבד.");
      setSelectedFile(null);
      resetInput();
      return;
    }
    setSelectedFile(file);
    setError(null);
    setResult(null);
  }, [resetInput]);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0] ?? null;
    pickFile(file);
  };

  async function uploadFile(file: File) {
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("candidateTrack", candidateTrack);
      if (scheduledAt.trim()) {
        formData.append("scheduledAt", new Date(scheduledAt).toISOString());
      }

      const res = await fetch("/api/admin/import-excel", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as
        | ImportSuccessResponse
        | ImportErrorResponse;

      if (!res.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : "ייבוא הקובץ נכשל."
        );
        return;
      }

      const success = data as ImportSuccessResponse;
      setResult(success);
      if (success.groupId) {
        rememberImportedGroupForSchedule(success.groupId);
      }
      setSelectedFile(null);
      resetInput();
    } catch {
      setError("אירעה שגיאה במהלך ייבוא הקובץ.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onImportClick() {
    if (!selectedFile || submitting) {
      return;
    }
    await uploadFile(selectedFile);
  }

  return (
    <AdminCard>
      <AdminSectionHeader
        icon={<IconUpload />}
        title="ייבוא מועמדות מקובץ Excel"
        description="העלי קובץ עם עמודות: שם, שם משפחה, מייל, טלפון, סמינר, שם מבחן והערות. המועמדות ייווצרו בקבוצה חדשה לפי שם הקובץ."
      />

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

      <label className="mt-5 block">
        <AdminLabel>תאריך ושעת מבחן (אופציונלי)</AdminLabel>
        <AdminInput
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          disabled={submitting}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          אם תבחרי תאריך, הוא יעודכן לכל המועמדות מיד לאחר הייבוא
        </p>
      </label>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 transition ${
          dragging
            ? "border-brand-500 bg-brand-50/60 scale-[1.01]"
            : "border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-brand-50/30"
        } ${submitting ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={submitting}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <IconUpload className="h-7 w-7" />
        </div>
        <p className="text-base font-bold text-slate-800">
          גררו קובץ לכאן או לחצו לבחירה
        </p>
        <p className="mt-1 text-sm text-slate-500">.xlsx, .xls או .csv</p>
        {selectedFile && (
          <span className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm">
            <IconUpload className="h-4 w-4" />
            {selectedFile.name}
          </span>
        )}
      </div>

      <AdminButton
        onClick={() => void onImportClick()}
        disabled={!selectedFile || submitting}
        className="mt-5 w-full"
        size="lg"
      >
        {submitting ? "מייבא…" : "ייבוא מועמדות"}
      </AdminButton>

      {error && (
        <div className="mt-4">
          <AdminAlert variant="error">{error}</AdminAlert>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-3">
          {result.imported > 0 && (
            <AdminAlert variant="success" role="status">
              יובאו בהצלחה {result.imported} מועמדות לקבוצה «{result.groupName}
              » ב-Monday.
              {typeof result.scheduleUpdated === "number" &&
                result.scheduleUpdated > 0 && (
                  <>
                    {" "}
                    עודכן תאריך המבחן ל-{result.scheduleUpdated} מועמדות.
                  </>
                )}
            </AdminAlert>
          )}

          {result.failed > 0 && (
            <AdminAlert variant="warning">
              <p className="font-semibold">
                {result.failed} שורות נכשלו מתוך {result.totalRows}.
              </p>
              <ul className="mt-2 max-h-48 list-inside list-disc space-y-1 overflow-y-auto text-xs">
                {result.errors.map((err) => (
                  <li key={`${err.row}-${err.message}`}>
                    שורה {err.row}
                    {err.name ? ` (${err.name})` : ""}: {err.message}
                  </li>
                ))}
              </ul>
            </AdminAlert>
          )}

          {result.imported === 0 && result.failed === 0 && (
            <AdminAlert variant="warning">לא יובאו מועמדות.</AdminAlert>
          )}
        </div>
      )}
    </AdminCard>
  );
}
