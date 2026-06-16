"use client";

import { useState } from "react";
import { ExamBranding } from "@/components/exam/ExamBranding";
import { AdminCreateCandidateForm } from "@/app/(admin)/admin/AdminCreateCandidateForm";
import { AdminBulkScheduleForm } from "@/app/(admin)/admin/AdminBulkScheduleForm";
import { AdminExcelImportForm } from "@/app/(admin)/admin/AdminExcelImportForm";
import { AdminTestEditor } from "@/app/(admin)/admin/AdminTestEditor";
import {
  AdminPageBackground,
  IconCalendar,
  IconEdit,
  IconUpload,
  IconUserPlus,
} from "./AdminUI";

type AdminSection = "create" | "import" | "schedule" | "tests";

const SECTIONS: Array<{
  id: AdminSection;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "create",
    label: "מועמדת חדשה",
    shortLabel: "חדשה",
    description: "יצירת קישור מבחן ייחודי",
    icon: <IconUserPlus />,
  },
  {
    id: "import",
    label: "ייבוא Excel",
    shortLabel: "ייבוא",
    description: "העלאת רשימת מועמדות",
    icon: <IconUpload />,
  },
  {
    id: "schedule",
    label: "תזמון קבוצה",
    shortLabel: "תזמון",
    description: "קביעת תאריך מבחן",
    icon: <IconCalendar />,
  },
  {
    id: "tests",
    label: "עריכת מבחנים",
    shortLabel: "מבחנים",
    description: "שאלות ותשובות",
    icon: <IconEdit />,
  },
];

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>("create");

  return (
    <AdminPageBackground>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 text-center">
          <ExamBranding className="mx-auto" />
          <p className="mt-3 text-sm font-medium tracking-wide text-brand-700/80">
            לוח בקרה למנהלת
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            ניהול מועמדות ומבחנים
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            יצירה, ייבוא, תזמון ועריכה — הכל במקום אחד, בצורה פשוטה וברורה.
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <nav
            className="lg:sticky lg:top-6 lg:w-56 lg:shrink-0"
            aria-label="אזורי ניהול"
          >
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-w-[7.5rem] shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-right transition lg:min-w-0 lg:w-full ${
                      isActive
                        ? "border-brand-300 bg-gradient-to-l from-brand-600 to-violet-600 text-white shadow-lg shadow-brand-300/35"
                        : "border-white/70 bg-white/70 text-slate-700 shadow-sm backdrop-blur hover:border-brand-200 hover:bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isActive
                          ? "bg-white/20"
                          : "bg-brand-50 text-brand-600"
                      }`}
                    >
                      {section.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-tight">
                        <span className="sm:hidden">{section.shortLabel}</span>
                        <span className="hidden sm:inline">{section.label}</span>
                      </span>
                      <span
                        className={`mt-0.5 hidden text-xs leading-tight sm:block ${
                          isActive ? "text-white/80" : "text-slate-500"
                        }`}
                      >
                        {section.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="min-w-0 flex-1">
            {activeSection === "create" && <AdminCreateCandidateForm />}
            {activeSection === "import" && <AdminExcelImportForm />}
            {activeSection === "schedule" && <AdminBulkScheduleForm />}
            {activeSection === "tests" && <AdminTestEditor />}
          </main>
        </div>
      </div>
    </AdminPageBackground>
  );
}
