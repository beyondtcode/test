"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type MondayGroup = {
  id: string;
  title: string;
  itemCount: number;
};

type ScheduleResponse =
  | {
      groupId: string;
      groupTitle: string;
      scheduledAt: string;
      updated: number;
      failed: number;
      errors: Array<{ itemId: string; name?: string; message: string }>;
      error?: undefined;
    }
  | { error: string };

const LAST_IMPORTED_GROUP_KEY = "admin_last_imported_group_id";

function defaultScheduledLocalValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AdminBulkScheduleForm() {
  const [groups, setGroups] = useState<MondayGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupId, setGroupId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledLocalValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScheduleResponse | null>(null);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/monday-groups");
      const data = (await res.json()) as
        | { groups: MondayGroup[] }
        | { error: string };

      if (!res.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : "טעינת הקבוצות נכשלה."
        );
        setGroups([]);
        return;
      }

      const list = "groups" in data ? data.groups : [];
      setGroups(list);

      const lastImported = sessionStorage.getItem(LAST_IMPORTED_GROUP_KEY);
      if (lastImported && list.some((g) => g.id === lastImported)) {
        setGroupId(lastImported);
        sessionStorage.removeItem(LAST_IMPORTED_GROUP_KEY);
      } else {
        setGroupId((current) => current || list[0]?.id || "");
      }
    } catch {
      setError("אירעה שגיאה בטעינת הקבוצות.");
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === groupId),
    [groups, groupId]
  );

  const canSubmit = Boolean(
    groupId && scheduledAt && !submitting && !loadingGroups
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/set-group-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      const data = (await res.json()) as ScheduleResponse;

      if (!res.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : "עדכון התאריכים נכשל."
        );
        return;
      }

      setResult(data);
    } catch {
      setError("אירעה שגיאה בעדכון תאריכי המבחן.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur">
      <h2 className="text-2xl font-semibold text-slate-900">
        קביעת תאריך מבחן לקבוצה
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        בחרי קבוצה מ-Monday (למשל קבוצת ייבוא Excel) והגדירי תאריך ושעה אחידים.
        התאריך יעודכן לכל המועמדות בקבוצה, כולל תזמון התראת QStash לשליחת
        המבחן.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-800">קבוצה ב-Monday</span>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            disabled={loadingGroups || submitting || groups.length === 0}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {loadingGroups && <option value="">טוען קבוצות…</option>}
            {!loadingGroups && groups.length === 0 && (
              <option value="">אין קבוצות עם מועמדות</option>
            )}
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title} ({group.itemCount} מועמדות)
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-800">
            תאריך ושעת מבחן
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/60 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "מעדכן…" : "עדכון תאריך לכל המועמדות בקבוצה"}
          </button>
          <button
            type="button"
            onClick={() => void loadGroups()}
            disabled={loadingGroups || submitting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            רענון קבוצות
          </button>
        </div>

        {selectedGroup && !loadingGroups && (
          <p className="text-xs text-slate-500">
            יעודכנו עד {selectedGroup.itemCount} מועמדות בקבוצה «
            {selectedGroup.title}».
          </p>
        )}

        {error && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>

      {result && "updated" in result && (
        <div className="mt-4 space-y-3">
          {result.updated > 0 && (
            <p
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              עודכן תאריך המבחן ל-{result.updated} מועמדות בקבוצה «
              {result.groupTitle}».
            </p>
          )}

          {result.failed > 0 && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              <p className="font-medium">{result.failed} עדכונים נכשלו.</p>
              <ul className="mt-2 max-h-48 list-inside list-disc space-y-1 overflow-y-auto text-xs">
                {result.errors.map((err) => (
                  <li key={err.itemId}>
                    {err.name ?? err.itemId}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Call after a successful Excel import to pre-select that group. */
export function rememberImportedGroupForSchedule(groupId: string): void {
  sessionStorage.setItem(LAST_IMPORTED_GROUP_KEY, groupId);
}
