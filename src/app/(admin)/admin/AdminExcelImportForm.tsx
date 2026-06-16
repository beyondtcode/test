"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  CANDIDATE_TRACK_OPTIONS,
  DEFAULT_CANDIDATE_TRACK,
  type CandidateTrack,
} from "@/lib/monday";
import { rememberImportedGroupForSchedule } from "./AdminBulkScheduleForm";

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
  error?: undefined;
};

type ImportErrorResponse = {
  error: string;
};

const ACCEPT = ".xlsx,.xls,.csv";

export function AdminExcelImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [candidateTrack, setCandidateTrack] = useState<CandidateTrack>(
    DEFAULT_CANDIDATE_TRACK
  );
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
    <div className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur">
      <h2 className="text-2xl font-semibold text-slate-900">
        ייבוא מועמדות מקובץ Excel
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        העלי קובץ עם עמודות: שם, שם משפחה, מייל, טלפון, סמינר (מקור מועמד),
        שם מבחן, והערות (אופציונלי). שם ושם משפחה נקראים מעמודות נפרדות ומשולבים
        לשם פריט אחד ב-Monday (למשל: רחל כהן). המועמדות ייווצרו בקבוצה חדשה לפי
        שם הקובץ, ללא תאריך מבחן וללא שליחת מיילים.
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-medium text-slate-800">
          מסלול נבחן <span className="text-red-600">*</span>
        </span>
        <select
          value={candidateTrack}
          onChange={(e) => setCandidateTrack(e.target.value as CandidateTrack)}
          disabled={submitting}
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          {CANDIDATE_TRACK_OPTIONS.map((track) => (
            <option key={track} value={track}>
              {track}
            </option>
          ))}
        </select>
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
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition ${
          dragging
            ? "border-indigo-500 bg-indigo-50/50"
            : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/30"
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
        <p className="text-sm font-medium text-slate-800">
          גררו קובץ לכאן או לחצו לבחירה
        </p>
        <p className="mt-1 text-xs text-slate-500">.xlsx, .xls או .csv</p>
        {selectedFile && (
          <p className="mt-3 rounded-lg bg-white px-3 py-1.5 text-sm text-indigo-800 shadow-sm">
            {selectedFile.name}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void onImportClick()}
        disabled={!selectedFile || submitting}
        className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/60 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "מייבא…" : "ייבוא מועמדות"}
      </button>

      {error && (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          {result.imported > 0 && (
            <p
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              יובאו בהצלחה {result.imported} מועמדות לקבוצה «{result.groupName}
              » ב-Monday.
            </p>
          )}

          {result.failed > 0 && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              <p className="font-medium">
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
            </div>
          )}

          {result.imported === 0 && result.failed === 0 && (
            <p
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              לא יובאו מועמדות.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
