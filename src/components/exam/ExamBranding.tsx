import Image from "next/image";

export function ExamBranding({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/beyond-code-logo.png"
      alt="[beyond]code"
      width={320}
      height={64}
      className={`h-10 w-auto sm:h-12 ${className}`}
      priority
    />
  );
}
