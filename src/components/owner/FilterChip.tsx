"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface ChipOption {
  label: string;
  active?: boolean;
  /** Navigate to this URL on click (menu closes automatically). */
  href?: string;
  /** Client-side handler (alternative to href). */
  onSelect?: () => void;
}

/** Lime check used to mark the active option (transparent when inactive). */
function CheckMark({ active }: { active?: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 shrink-0 ${active ? "text-lime-300" : "text-transparent"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Notion/Stacklane-style filter chip with a dark dropdown menu.
 * Closes on outside click, Escape, and option selection.
 */
export function FilterChip({
  label,
  options,
  align = "left",
  minWidth,
}: {
  label: string;
  options: ChipOption[];
  align?: "left" | "right";
  minWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const rowCls = (active?: boolean) =>
    `flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
      active
        ? "font-bold text-white bg-white/[0.06]"
        : "font-medium text-neutral-300 hover:bg-white/[0.05] hover:text-white"
    }`;

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border transition-colors cursor-pointer whitespace-nowrap select-none text-xs font-bold ${
          open
            ? "bg-white/[0.08] border-white/25 text-white"
            : "bg-[#131419] hover:bg-white/[0.06] border-white/10 text-neutral-200"
        }`}
      >
        {label}
        <svg
          className={`w-3 h-3 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1.5 z-40 ${
            minWidth || "min-w-[200px]"
          } max-h-[320px] overflow-y-auto rounded-xl border border-white/10 bg-[#0f1015] shadow-2xl shadow-black/70 p-1`}
          role="menu"
        >
          {options.map((o) =>
            o.href && !o.onSelect ? (
              <Link key={o.label} href={o.href} onClick={() => setOpen(false)} className={rowCls(o.active)} role="menuitem">
                <CheckMark active={o.active} />
                {o.label}
              </Link>
            ) : (
              <button
                key={o.label}
                type="button"
                onClick={() => {
                  o.onSelect?.();
                  setOpen(false);
                }}
                className={rowCls(o.active)}
                role="menuitem"
              >
                <CheckMark active={o.active} />
                {o.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
