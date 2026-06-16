import { Heebo } from "next/font/google";
import { isAdminSessionValidFromCookies } from "@/lib/admin/session";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLoginForm } from "./AdminLoginForm";
import { AdminPageBackground } from "@/components/admin/AdminUI";
import { ExamBranding } from "@/components/exam/ExamBranding";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

export default async function AdminDashboardPage() {
  const isAuthed = await isAdminSessionValidFromCookies();

  return (
    <main
      dir="rtl"
      lang="he"
      className={`${heebo.className} text-right text-slate-800 antialiased`}
    >
      {isAuthed ? (
        <AdminDashboard />
      ) : (
        <AdminPageBackground>
          <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12">
            <div className="mb-8 text-center">
              <ExamBranding className="mx-auto" />
              <p className="mt-3 text-sm font-medium tracking-wide text-brand-700/80">
                לוח בקרה למנהלת
              </p>
            </div>
            <AdminLoginForm />
          </div>
        </AdminPageBackground>
      )}
    </main>
  );
}
