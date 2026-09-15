import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Ring({
  value,
  max,
  label,
  unit,
  color = "primary",
  size = 132,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color?: string;
  size?: number;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={12}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ stroke: `var(--color-${color})`, transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-num text-2xl font-semibold">{Math.round(value).toLocaleString()}</span>
        <span className="text-[11px] text-muted-foreground">
          / {Math.round(max).toLocaleString()} {unit}
        </span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-num text-xs text-muted-foreground">
          {Math.round(value * 10) / 10} / {max} {unit}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: `var(--color-${color})` }}
        />
      </div>
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-secondary",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Disclaimer({ text }: { text: string }) {
  return (
    <p className="mt-6 rounded-xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
      {text}
    </p>
  );
}

export function EstimateTag() {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
      Estimate
    </span>
  );
}

export function HydrationDots({ week }: { week: { date: string; met: boolean }[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {week.map((d) => (
        <span
          key={d.date}
          title={`${d.date} — ${d.met ? "goal met" : "below goal"}`}
          className={cn(
            "size-2.5 rounded-full",
            d.met ? "bg-[var(--color-water)]" : "bg-muted ring-1 ring-border",
          )}
        />
      ))}
    </div>
  );
}

