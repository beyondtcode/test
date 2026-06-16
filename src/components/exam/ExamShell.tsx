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
      className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-50 via-white to-violet-100/80 text-right text-slate-800 antialiased ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl"
      />
      <div className="relative">
        {showLogo && (
          <div className="flex justify-center px-4 pb-2 pt-8 sm:pt-10">
            <ExamBranding />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
