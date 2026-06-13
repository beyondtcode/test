export function ExamBranding({ className = "" }: { className?: string }) {
  return (
    <div
      dir="rtl"
      className={`inline-flex items-baseline justify-center gap-1.5 font-sans tracking-tight ${className}`}
      aria-label="beyond code"
    >
      <span className="text-2xl font-bold text-slate-800 sm:text-3xl">code</span>
      <span className="text-2xl font-bold sm:text-3xl">
        <span className="text-brand-600">[</span>
        <span className="text-brand-600">beyond</span>
        <span className="text-brand-600">]</span>
      </span>
    </div>
  );
}
