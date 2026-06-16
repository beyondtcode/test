"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminLabel,
  AdminSectionHeader,
  AdminSelect,
  IconCalendar,
} from "@/components/admin/AdminUI";

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
    <AdminCard>
      <AdminSectionHeader
        icon={<IconCalendar />}
        title="קביעת תאריך מבחן לקבוצה"
        description="בחרי קבוצה מ-Monday והגדירי תאריך ושעה אחידים. התאריך יעודכן לכל המועמדות בקבוצה, כולל תזמון שליחת המבחן."
        action={
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => void loadGroups()}
            disabled={loadingGroups || submitting}
          >
            {loadingGroups ? "טוען…" : "רענון"}
          </AdminButton>
        }
      />

      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <AdminLabel>קבוצה ב-Monday</AdminLabel>
          <AdminSelect
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            disabled={loadingGroups || submitting || groups.length === 0}
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
          </AdminSelect>
        </label>

        <label className="block">
          <AdminLabel required>תאריך ושעת מבחן</AdminLabel>
          <AdminInput
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={submitting}
            required
          />
        </label>

        {selectedGroup && !loadingGroups && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-brand-900">
            יעודכנו עד <strong>{selectedGroup.itemCount}</strong> מועמדות
            בקבוצה «{selectedGroup.title}»
          </div>
        )}

        <AdminButton
          type="submit"
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          {submitting ? "מעדכן…" : "עדכון תאריך לכל המועמדות בקבוצה"}
        </AdminButton>

        {error && <AdminAlert variant="error">{error}</AdminAlert>}
      </form>

      {result && "updated" in result && (
        <div className="mt-5 space-y-3">
          {result.updated > 0 && (
            <AdminAlert variant="success" role="status">
              עודכן תאריך המבחן ל-{result.updated} מועמדות בקבוצה «
              {result.groupTitle}».
            </AdminAlert>
          )}

          {result.failed > 0 && (
            <AdminAlert variant="warning">
              <p className="font-semibold">{result.failed} עדכונים נכשלו.</p>
              <ul className="mt-2 max-h-48 list-inside list-disc space-y-1 overflow-y-auto text-xs">
                {result.errors.map((err) => (
                  <li key={err.itemId}>
                    {err.name ?? err.itemId}: {err.message}
                  </li>
                ))}
              </ul>
            </AdminAlert>
          )}
        </div>
      )}
    </AdminCard>
  );
}

/** Call after a successful Excel import to pre-select that group. */
export function rememberImportedGroupForSchedule(groupId: string): void {
  sessionStorage.setItem(LAST_IMPORTED_GROUP_KEY, groupId);
}
