import { Heebo } from "next/font/google";
import { isAdminSessionValidFromCookies } from "@/lib/admin/session";
import { AdminCreateCandidateForm } from "./AdminCreateCandidateForm";
import { AdminLoginForm } from "./AdminLoginForm";
import { AdminTestEditor } from "./AdminTestEditor";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

export default function AdminDashboardPage() {
  const isAuthed = isAdminSessionValidFromCookies();

  return (
    <main
      dir="rtl"
      lang="he"
      className={`${heebo.className} min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 text-right text-slate-800`}
    >
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-start px-6 py-10">
        <div className="w-full">
          <h1 className="text-center text-2xl font-semibold text-slate-900">
            לוח בקרה
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
            {!isAuthed
              ? "התחברי כדי לנהל את המועמדות."
              : "יצירה ושליחה של קישורי מבחן למועמדות."}
          </p>
        </div>

        <div className="mt-8 w-full">
          {isAuthed ? (
            <>
              <AdminCreateCandidateForm />
              <AdminTestEditor />
            </>
          ) : (
            <AdminLoginForm />
          )}
        </div>
      </div>
    </main>
  );
}
