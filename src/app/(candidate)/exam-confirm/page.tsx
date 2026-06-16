import { Heebo } from "next/font/google";
import { Suspense } from "react";
import { CandidateExamConfirmFlow } from "@/components/candidate/CandidateExamConfirmFlow";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

function ExamConfirmLoading() {
  return (
    <main
      dir="rtl"
      lang="he"
      className={`${heebo.className} flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50/70 to-violet-100/50 p-8 text-right`}
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
        role="status"
        aria-label="טוען"
      />
    </main>
  );
}

export default function CandidateExamConfirmPage() {
  return (
    <div className={heebo.className}>
      <Suspense fallback={<ExamConfirmLoading />}>
        <CandidateExamConfirmFlow />
      </Suspense>
    </div>
  );
}
