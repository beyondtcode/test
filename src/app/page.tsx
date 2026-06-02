import { Heebo } from "next/font/google";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

export default function HomePage() {
  return (
    <main
      dir="rtl"
      lang="he"
      className={`${heebo.className} min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 text-right text-slate-800`}
    >
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 py-10">
        <div className="w-full rounded-2xl border border-slate-200/70 bg-white/70 p-8 shadow-sm backdrop-blur">
          <h1 className="text-center text-3xl font-semibold tracking-tight text-slate-900">
            ברוכים הבאים ל-`[beyond] code`
          </h1>
          <p className="mt-4 text-center leading-relaxed text-slate-700">
            כדי להתחיל את המבחן יש להשתמש בקישור הייחודי שקיבלת במייל.
            <br />
            בדף זה אין כפתור התחלה.
          </p>
        </div>
      </div>
    </main>
  );
}
