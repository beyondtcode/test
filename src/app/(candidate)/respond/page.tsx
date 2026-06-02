import { Heebo } from "next/font/google";
import { Suspense } from "react";
import { CandidateRespondFlow } from "@/components/candidate/CandidateRespondFlow";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

function RespondLoading() {
  return (
    <main
      dir="rtl"
      lang="he"
      className={`${heebo.className} flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50/40 p-8 text-right`}
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"
        role="status"
        aria-label="טוען"
      />
    </main>
  );
}

export default function CandidateRespondPage() {
  return (
    <div className={heebo.className}>
      <Suspense fallback={<RespondLoading />}>
        <CandidateRespondFlow />
      </Suspense>
    </div>
  );
}
