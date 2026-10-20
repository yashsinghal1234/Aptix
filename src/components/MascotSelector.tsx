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
      <main className="flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between gap-6 px-1 pt-1">
          <div>
            <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
              Bring your spirit<span className="text-lime-300">.</span>
            </h1>
          </div>
          <Flower className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
        </div>

        <div className="w-full rounded-2xl border border-white/10 bg-[#0e0f13] p-5 sm:p-7 shadow-2xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Choose your Spirit Mascot</h2>
              <p className="text-xs text-neutral-400 mt-1.5">
                Select one companion for this attempt. Power-bluff descriptions are playful cosmetic flavor, never a scoring advantage.
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-lime-300 hover:brightness-110 text-black font-black text-xs transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? "Locking in…" : `Continue with ${selectedMascot.name}`}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {MASCOTS.map((m) => {
              const sel = selectedMascot.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMascot(m)}
                  className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                    sel
                      ? "border-lime-300/70 bg-lime-300/[0.05] shadow-[0_0_24px_rgba(190,242,100,0.12)] ring-1 ring-lime-300/40"
                      : "border-white/10 bg-black/40 hover:bg-white/[0.04] hover:border-white/25"
                  }`}
                >
                  <div>
                    <span className="relative block w-full h-48 sm:h-52 rounded-xl bg-white/[0.04] border border-white/5 overflow-hidden">
                      {m.gifUrl ? (
                        <img
                          src={m.gifUrl}
                          alt={m.name}
                          style={m.imgZoom ? { transform: `scale(${m.imgZoom})`, transformOrigin: m.imgOrigin ?? "center" } : undefined}
                          className={`w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] select-none pointer-events-none ${m.imgZoom ? "" : "scale-[1.35]"}`}
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-6xl">{m.emoji}</span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                      <span className="absolute bottom-2 left-2.5 right-2.5 block">
                        <span className="block text-[15px] font-black text-white leading-tight truncate">{m.name}</span>
                        <span className="block text-[10px] font-mono text-lime-300 uppercase tracking-wider truncate">{m.title}</span>
                      </span>
                      <span className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-black/60 backdrop-blur-sm ${sel ? "border-lime-300" : "border-neutral-500"}`}>
                        {sel && <span className="w-2.5 h-2.5 rounded-full bg-lime-300" />}
                      </span>
                    </span>
                    <span className="block mt-2.5 px-1 text-[11px] text-neutral-400 leading-relaxed">{m.tagline}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4" />
        </div>
      </main>
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[#060607]/95 backdrop-blur-sm">
        <CandidateFooter />
      </div>
      <div className="h-12 shrink-0" />
    </div>
  );
}
