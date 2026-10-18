import React from "react";
import Link from "next/link";

/** Stacklane-style breadcrumb strip: back arrow + "Section / Current page". */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center text-[13px] min-w-0">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2 min-w-0">
          {i > 0 && <span className="text-neutral-700 shrink-0">/</span>}
          {it.href ? (
            <Link href={it.href} className="text-neutral-400 hover:text-white font-medium transition-colors whitespace-nowrap">
              {it.label}
            </Link>
          ) : (
            <span className="text-neutral-200 font-semibold truncate">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Small rounded outline pill used on the hero card header row. */
export function HeroPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "lime" | "rose" }) {
  const cls =
    tone === "lime"
      ? "border-lime-300/25 bg-lime-300/10 text-lime-200"
      : tone === "rose"
        ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
        : "border-white/10 bg-white/[0.04] text-neutral-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

/** Compact metric card: small icon + label on top, big value underneath. */
export function StackStatCard({
  label,
  icon,
  value,
  sub,
  lime,
}: {
  label: string;
  icon?: React.ReactNode;
  value: React.ReactNode;
  sub?: string;
  lime?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4 transition-colors duration-300 hover:border-white/20">
      <p className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      <p className={`mt-2 text-[24px] leading-none font-black tracking-tight tabular-nums ${lime ? "text-lime-300" : "text-white"}`}>
        {value}
        {sub ? <span className="text-[10px] font-medium text-neutral-500">{sub}</span> : null}
      </p>
    </div>
  );
}

/**
 * Stacklane-style activity tick strip: a row of thin vertical bars whose
 * heights follow 0–1 fill values.
 *
 * Pass `threshold` (0–1, e.g. pass cutoff) to make bars fully dynamic:
 * height AND color derive from the value itself —
 *   ≥ threshold          → lime (passed)
 *   ≥ threshold / 2      → amber (approaching cutoff)
 *   > 0                  → rose (well below cutoff)
 *   0                    → muted gray (no data)
 * Without a threshold, per-point tones ("lime" | "white" | "muted") are used.
 */
export function TickStrip({
  data,
  threshold,
  emptyLabel = "No activity recorded yet.",
}: {
  data: { fill: number; tone?: "lime" | "white" | "muted" }[];
  threshold?: number;
  emptyLabel?: string;
}) {
  const tones: Record<string, string> = {
    lime: "bg-lime-300",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    white: "bg-neutral-200",
    muted: "bg-zinc-700",
  };
  // Pixel heights (not %) so each bar is exactly proportional to its value:
  // a candidate at 81% gets a bar at 81% of full strip height.
  // The series is resampled to a fixed tick count so the strip is always dense
  // and spans the full card width, regardless of how many data points exist.
  const TICKS = 150;
  const FULL = 48; // px, inside a 56px (h-14) strip
  const clamp = (v: number) => Math.max(0, Math.min(1, v || 0));
  const toneFor = (fill: number, tone?: "lime" | "white" | "muted") => {
    if (threshold != null) {
      if (fill >= threshold) return "lime";
      if (fill >= threshold / 2) return "amber";
      if (fill > 0) return "rose";
      return "muted";
    }
    return tone ?? "muted";
  };

  let bars: { fill: number; tone: string }[] = [];
  if (data.length === 1) {
    bars = Array.from({ length: TICKS }, () => ({ fill: clamp(data[0].fill), tone: toneFor(clamp(data[0].fill), data[0].tone) }));
  } else if (data.length > 1) {
    for (let j = 0; j < TICKS; j++) {
      const p = (j / (TICKS - 1)) * (data.length - 1);
      const lo = Math.floor(p);
      const hi = Math.min(data.length - 1, lo + 1);
      const t = p - lo;
      const fill = clamp(data[lo].fill) * (1 - t) + clamp(data[hi].fill) * t;
      bars.push({ fill, tone: toneFor(fill, data[Math.round(p)].tone) });
    }
  }

  return (
    <div className="mt-5 flex items-end h-14 w-full">
      {bars.length === 0 ? (
        <span className="text-[11px] text-neutral-500">{emptyLabel}</span>
      ) : (
        bars.map((d, i) => (
          <span key={i} className="flex-1 min-w-[2px] h-full flex items-end justify-center">
            <span
              className={`tick-bar w-[3px] rounded-[1px] ${tones[d.tone]}`}
              style={{
                height: `${Math.max(4, Math.round(d.fill * FULL))}px`,
                animationDelay: `${Math.min(600, i * 4)}ms`,
              }}
            />
          </span>
        ))
      )}
    </div>
  );
}
