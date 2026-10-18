"use client";

import React, { useState } from "react";

/**
 * Tab strip in the Switchlane style: a horizontal row of icon + label tabs
 * over a hairline rule; the active tab is highlighted with an underline.
 * Exactly one tab is open at a time (default: the first).
 */
export function FileTabs({
  items,
}: {
  items: { key: string; label: string; icon?: React.ReactNode; content: React.ReactNode }[];
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.key ?? null);
  const active = items.find((it) => it.key === open) ?? null;

  return (
    <section>
      {/* Tab strip */}
      <div className="flex items-center gap-6 overflow-x-auto px-1">
        {items.map((it) => {
          const isActive = it.key === open;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => setOpen(it.key)}
              aria-selected={isActive}
              className={`group relative flex items-center gap-2 px-2 py-3 text-[13px] font-semibold whitespace-nowrap rounded-lg transition-all duration-300 ${
                isActive ? "text-white" : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              {it.icon && <span className="transition-transform duration-300 group-hover:scale-110">{it.icon}</span>}
              {it.label}
              {/* Underline indicator — grows in smoothly on hover/select */}
              <span
                className={`absolute inset-x-0 -bottom-px h-[2px] rounded-full origin-center transition-all duration-300 ${
                  isActive
                    ? "bg-white opacity-100 scale-x-100"
                    : "bg-neutral-400 opacity-0 scale-x-50 group-hover:opacity-50 group-hover:scale-x-75"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Active tab content — keyed so switching re-mounts with a smooth fade/slide */}
      {active && <div key={active.key} className="tab-panel pt-4">{active.content}</div>}
    </section>
  );
}
