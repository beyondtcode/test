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
      className={`${heebo.className} flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50/40 p-8 text-right`}
    >
      <p className="text-slate-600">טוען את המבחן…</p>
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
