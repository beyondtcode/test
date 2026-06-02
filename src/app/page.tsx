import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        Candidate Testing Platform
      </h1>
      <p className="max-w-md text-center text-neutral-600 dark:text-neutral-400">
        Secure assessments for candidates. Magic links open the exam at{" "}
        <code className="text-sm">/test?token=...</code>.
      </p>
      <div className="flex gap-4">
        <Link
          href="/test"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Start test (candidate)
        </Link>
        <Link
          href="/admin"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          Admin
        </Link>
      </div>
    </main>
  );
}
