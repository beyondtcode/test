import { Heebo } from "next/font/google";
import { Suspense } from "react";
import { ExamFlow } from "@/components/exam/ExamFlow";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

function ExamLoading() {
  return (
    <main
      dir="rtl"
      lang="he"
      className={`${heebo.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-violet-100/80 p-8 text-right`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl"
      />
      <div className="relative rounded-3xl border border-white/70 bg-white/85 px-10 py-8 text-center shadow-xl shadow-brand-200/30 backdrop-blur-md">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
        <p className="font-semibold text-slate-800">טוען את המבחן…</p>
      </div>
    </main>
  );
}

export default function CandidateTestPage() {
  return (
    <div className={heebo.className}>
      <Suspense fallback={<ExamLoading />}>
        <ExamFlow />
      </Suspense>
    </div>
  );
}
