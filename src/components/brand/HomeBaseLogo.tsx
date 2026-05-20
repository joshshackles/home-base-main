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
      {tone === "light" ? <rect width="48" height="48" rx="14" fill="#111827" /> : null}
      <path d="M8 23.5 24 11l16 12.5-3.3 4.1-2.7-2.1V39H14V25.5l-2.7 2.1L8 23.5Z" fill={tone === "light" ? accent : "#061c3f"} />
      <path d="M20.3 39V28.5h7.4V39" fill={tone === "light" ? foreground : "#FFFFFF"} opacity={tone === "light" ? 0.92 : 1} />
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
