"use client";

import { useState } from "react";
import { MASCOTS, Mascot } from "@/lib/mascots";
import { saveCandidateMascotAction } from "@/app/actions/mascot";
import { CandidateTopbar, CandidateFooter } from "@/components/candidate/CandidateChrome";
import { Flower } from "@/components/owner/OpsPanels";

interface MascotSelectorProps {
  candidateName: string;
  sessionId: string;
  examTitle?: string;
  examMeta?: string;
  onConfirm: (mascotId: string) => void;
}

export function MascotSelector({ candidateName, sessionId, examTitle, examMeta, onConfirm }: MascotSelectorProps) {
  const [selectedMascot, setSelectedMascot] = useState<Mascot>(MASCOTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await saveCandidateMascotAction(sessionId, selectedMascot.id);
      if (res?.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }
      onConfirm(selectedMascot.id);
    } catch (err: any) {
      console.error("Mascot selection error:", err);
      setError("Failed to lock in emblem. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060607] text-neutral-100 flex flex-col font-sans select-none">
      <CandidateTopbar candidateName={candidateName} roll={`SES-${sessionId.slice(-4).toUpperCase()}`} />
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-start justify-between gap-6 px-1 pt-1">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">
              PRE-EXAM / Q4-26 · GAMIFIED MODE
            </p>
            <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
              Bring your spirit<span className="text-lime-300">.</span>
            </h1>
            <p className="text-[13px] text-neutral-400 mt-2.5">
              {candidateName} · {examTitle || "Quantitative Aptitude · Q4"}{examMeta ? ` · ${examMeta}` : " · 40 questions · 60 minutes"}
            </p>
          </div>
          <Flower className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 mt-1" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5 sm:p-7 max-w-4xl">
          <div className="flex items-center justify-between gap-3 mb-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-400">
              STATUS: CONFIRMATIONAL STATE · <span className="text-lime-200">Gamified + timed</span>
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              aria-label="Confirm selection"
              className="text-neutral-500 hover:text-white text-xl leading-none px-1 disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Choose your Spirit Mascot</h2>
          <p className="text-xs text-neutral-400 mt-1.5">
            Select one companion for this attempt. Power-bluff descriptions are playful cosmetic flavor, never a scoring advantage.
          </p>

          {error && (
            <p className="mt-3 text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MASCOTS.map((m) => {
              const sel = selectedMascot.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMascot(m)}
                  className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                    sel
                      ? "border-lime-300/70 bg-lime-300/[0.05] shadow-[0_0_24px_rgba(190,242,100,0.12)]"
                      : "border-white/10 bg-black/40 hover:bg-white/[0.04] hover:border-white/25"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-2xl">{m.emoji}</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${sel ? "border-lime-300" : "border-neutral-600"}`}>
                      {sel && <span className="w-2 h-2 rounded-full bg-lime-300" />}
                    </span>
                  </span>
                  <span className="block mt-2.5 text-sm font-black text-white">{m.name}</span>
                  <span className="block mt-1 text-[11px] text-neutral-400 leading-relaxed">{m.tagline}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs font-black text-white">One mascot. The same marks.</p>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              Cyber Lion appears on your exam header, the invigilator roster and the result podium. No changes to points, penalties, time, ranking or pass criteria. Existing result initials remain your identity marker.
            </p>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-neutral-300">
              Selected: <span className="font-bold text-white">● {selectedMascot.name}</span>
            </p>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-lime-300 hover:brightness-110 text-black font-black text-xs transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? "Locking in…" : `Continue with ${selectedMascot.name}`}
            </button>
          </div>
          <p className="mt-3 text-[10px] text-neutral-600 leading-relaxed">
            Standard (un-gamified) exams skip this selector. Your choice is cosmetic — never a scoring advantage.
          </p>
        </div>
      </main>
      <CandidateFooter />
    </div>
  );
}
