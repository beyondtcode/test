import type { ReactNode } from "react";
import { ExamBranding } from "./ExamBranding";

type ExamShellProps = {
  children: ReactNode;
  className?: string;
  showLogo?: boolean;
};

export function ExamShell({
  children,
  className = "",
  showLogo = true,
}: ExamShellProps) {
  return (
    <div
      dir="rtl"
      lang="he"
      className={`min-h-screen bg-gradient-to-b from-brand-50/70 via-white to-violet-100/50 text-right text-slate-800 antialiased ${className}`}
    >
      {showLogo && (
        <div className="flex justify-center px-4 pb-2 pt-8 sm:pt-10">
          <ExamBranding />
        </div>
      )}
      {children}
    </div>
  );
}
