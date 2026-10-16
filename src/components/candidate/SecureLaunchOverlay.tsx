"use client";

import React from "react";

export type SecureStep = {
  label: string;
  detail: string;
};

export const SECURE_STEPS: SecureStep[] = [
  { label: "Single-device lease", detail: "Confirming no other active session for this attempt." },
  { label: "Fullscreen lock", detail: "Requesting fullscreen. Stay inside it for the whole exam." },
  { label: "Server clock sync", detail: "Calibrating to server time. The server clock decides the deadline." },
  { label: "Recovery storage", detail: "Checking crash-recovery buffer for interrupted attempts." },
  { label: "Focus & tab monitor", detail: "Arming focus-loss, copy-paste and integrity logging." },
  { label: "Entering exam", detail: "Lockdown complete. Opening your question paper." },
];

const SEGMENTS = 24;

export function SecureLaunchOverlay({
  stepIndex,
  failed,
  failMessage,
  onClose,
}: {
  stepIndex: number;
  failed?: string | null;
  failMessage?: string | null;
  onClose?: () => void;
}) {
  const done = Math.min(stepIndex, SECURE_STEPS.length);
  const pct = Math.round((done / SECURE_STEPS.length) * 100);
  const filled = Math.round((done / SECURE_STEPS.length) * SEGMENTS);
  const current = SECURE_STEPS[Math.min(stepIndex, SECURE_STEPS.length - 1)];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full max-w-[560px] rounded-[28px] border border-white/15 bg-[#0b0c10] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {["secure", "browser", "lockdown"].map((t) => (
              <span key={t} className="text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md border border-white/15 text-neutral-300">
                {t}
              </span>
            ))}
          </div>
          <span aria-hidden className="text-neutral-600 tracking-[0.2em] text-sm font-black">•••</span>
        </div>

        <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
          Securing browser
        </h2>
        <div aria-hidden className="mt-4 h-px bg-white/15" />

        {failed || failMessage ? (
          <>
            <p className="mt-4 text-sm text-rose-300 leading-relaxed">{failMessage || failed}</p>
            <p className="mt-4 text-4xl sm:text-5xl font-black text-white tabular-nums">{pct}%</p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full py-3.5 px-4 rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-neutral-200 font-semibold text-sm transition-all"
              >
                Back
              </button>
            )}
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-neutral-300 leading-relaxed">
              {current.label} — {current.detail}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-4xl sm:text-5xl font-black text-white tabular-nums">{pct}%</p>
              <span className="text-[11px] font-bold text-neutral-300 border border-white/15 rounded-md px-2 py-1">
                step {Math.min(done + 1, SECURE_STEPS.length)}/{SECURE_STEPS.length}
              </span>
              <span className="text-[11px] text-neutral-500">of lockdown complete</span>
            </div>
          </>
        )}

        <div className="mt-5 flex gap-1.5" aria-hidden>
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <span
              key={i}
              className={`h-10 sm:h-12 flex-1 rounded-[3px] transition-colors ${i < filled ? "bg-white" : "bg-white/15"}`}
            />
          ))}
        </div>

        <ul className="mt-5 space-y-1.5">
          {SECURE_STEPS.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2.5 text-xs">
              <span
                aria-hidden
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                  i < done ? "bg-white text-black" : i === done && !(failed || failMessage) ? "border border-white/40 text-white" : "border border-white/15 text-neutral-600"
                }`}
              >
                {i < done ? "✓" : i === done && !(failed || failMessage) ? "…" : ""}
              </span>
              <span className={i < done ? "text-neutral-200 font-semibold" : i === done ? "text-white font-bold" : "text-neutral-600"}>
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
