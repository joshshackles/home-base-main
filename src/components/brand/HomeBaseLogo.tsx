import type { SVGProps } from "react";

type LogoProps = SVGProps<SVGSVGElement> & {
  tone?: "light" | "dark";
  showWordmark?: boolean;
};

export function HomeBaseMark({ tone = "dark", ...props }: Omit<LogoProps, "showWordmark">) {
  const accent = tone === "light" ? "#60A5FA" : "#2563EB";
  const foreground = tone === "light" ? "#FFFFFF" : "#0F172A";

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <rect width="48" height="48" rx="14" fill={tone === "light" ? "#111827" : "#FFFFFF"} />
      <path d="M13 34V17.7L24 10l11 7.7V34h-7.7V23.5h-6.6V34H13Z" fill={accent} />
      <path d="M18.6 34V20.9L24 17l5.4 3.9V34h-2.1V23.5h-6.6V34h-2.1Z" fill={foreground} opacity="0.92" />
    </svg>
  );
}

export function HomeBaseLogo({ tone = "dark", showWordmark = true, className, ...props }: LogoProps) {
  const text = tone === "light" ? "text-white" : "text-slate-950";

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <HomeBaseMark tone={tone} className="h-9 w-9 shrink-0" {...props} />
      {showWordmark ? (
        <span className="leading-none">
          <span className={`block text-base font-black tracking-tight ${text}`}>HomeBase</span>
          <span className={`block text-[10px] font-black uppercase tracking-[0.22em] ${tone === "light" ? "text-slate-300" : "text-slate-500"}`}>MLS</span>
        </span>
      ) : null}
    </span>
  );
}
