"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminLabel,
  AdminSectionHeader,
  IconLock,
} from "@/components/admin/AdminUI";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "התחברות נכשלה");
        return;
      }

      router.refresh();
      window.location.assign("/admin");
    } catch {
      setError("אירעה שגיאה במהלך ההתחברות. נסי שוב.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminCard className="w-full">
      <AdminSectionHeader
        icon={<IconLock />}
        title="כניסת מנהל"
        description="הזיני את הסיסמה כדי להיכנס ללוח הבקרה."
      />

      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <AdminLabel>סיסמה</AdminLabel>
          <AdminInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoComplete="current-password"
          />
        </label>

        {error && <AdminAlert variant="error">{error}</AdminAlert>}

        <AdminButton
          type="submit"
          disabled={submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? "מתחברים…" : "התחברות"}
        </AdminButton>
      </form>
    </AdminCard>
  );
}
