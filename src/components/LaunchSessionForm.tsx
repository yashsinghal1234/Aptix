"use client";

import { useState } from "react";
import { createSessionAction } from "@/app/actions/session";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function LaunchSessionForm({ 
  templateId, 
  autoOpenSchedule = false,
  center = false
}: { 
  templateId: string; 
  autoOpenSchedule?: boolean;
  center?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(autoOpenSchedule);
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [rosterText, setRosterText] = useState("");
  const [showRoster, setShowRoster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ pin: string; sessionId?: string; rosterAdded?: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLaunch = async (scheduledTime?: string) => {
    setLoading(true);
    setError(null);
    setSuccessData(null);

    const formData = new FormData();
    formData.append("examId", templateId);
    formData.append("timezoneOffset", new Date().getTimezoneOffset().toString());
    if (rosterText.trim()) formData.append("rosterText", rosterText);

    if (scheduledTime) {
      const localDate = new Date(scheduledTime);
      if (!isNaN(localDate.getTime())) {
        formData.append("startTime", localDate.toISOString());
      }
    }

    const res = await createSessionAction(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setSuccessData({ pin: res.pin || "Created", sessionId: res.sessionId, rosterAdded: (res as any).rosterAdded || 0 });
      setStartTimeLocal("");
      setRosterText("");
      setShowSchedule(false);
      setShowRoster(false);
      router.refresh();
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2.5">
      {/* Action Bar */}
      <div className={`flex items-center gap-2 flex-wrap ${center ? "justify-center" : ""}`}>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleLaunch()}
          className="text-xs px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5 text-black shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          <span>{loading && !showSchedule ? "Launching..." : "Launch Now"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowSchedule(!showSchedule);
            setError(null);
          }}
          className={`text-xs px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold transition-all shadow-sm border border-neutral-200 flex items-center gap-1.5 cursor-pointer ${
            showSchedule ? "ring-2 ring-white/50" : ""
          }`}
        >
          <svg className="w-3.5 h-3.5 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{showSchedule ? "Close" : "Schedule"}</span>
        </button>
      </div>

      {/* Expandable Schedule Form */}
      {showSchedule && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (startTimeLocal) handleLaunch(startTimeLocal);
          }}
          className="w-full p-3.5 bg-black/80 rounded-xl border border-neutral-700/80 space-y-2.5 animate-fadeIn"
        >
          <label className="block text-xs font-bold text-white tracking-wide">
            Select Start Date & Time
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <input
              type="datetime-local"
              required
              value={startTimeLocal}
              onChange={(e) => {
                setStartTimeLocal(e.target.value);
                if (error) setError(null);
              }}
              style={{ colorScheme: "dark" }}
              className="w-full sm:flex-1 text-sm px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl focus:border-white focus:outline-none text-white font-medium"
            />
            <button
              type="submit"
              disabled={loading || !startTimeLocal}
              className="w-full sm:w-auto px-5 py-2 bg-white hover:bg-neutral-200 text-black rounded-xl font-extrabold text-sm transition-all shadow-md whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Scheduling..." : "Confirm Schedule"}
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowRoster((v) => !v)}
              className="text-[11px] font-bold text-neutral-300 hover:text-white transition-colors"
            >
              {showRoster ? "− Hide approved students" : "+ Restrict to approved students (optional)"}
            </button>
            {showRoster && (
              <textarea
                value={rosterText}
                onChange={(e) => setRosterText(e.target.value)}
                rows={4}
                placeholder={"One per line:\nyash.2428c@example.edu\npriya@example.edu,Priya Sharma"}
                className="mt-2 w-full text-xs px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl focus:border-white focus:outline-none text-white font-mono placeholder:text-neutral-600"
              />
            )}
            <p className="mt-1 text-[10px] text-neutral-500">Blueprint list is inherited automatically. Extra emails here are added on top. Empty = open unless blueprint has a list.</p>
          </div>
        </form>
      )}

      {/* Error Banner */}
      {error && (
        <div className="text-[11px] font-medium text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2 flex items-start justify-between gap-2 animate-fadeIn">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-white font-bold ml-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Success Notification with PIN and Live Monitor Link */}
      {successData && (
        <div className="p-3 bg-[#0a0a0d] border border-white/10 rounded-xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-neutral-200 font-semibold">
                Session Created!{successData.rosterAdded ? ` · ${successData.rosterAdded} approved students` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessData(null)}
              className="text-neutral-500 hover:text-white font-bold text-xs"
            >
              &times;
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap bg-black/60 p-2 rounded-lg border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400">PIN:</span>
              <span className="font-mono font-black text-white text-sm tracking-wider">
                {successData.pin}
              </span>
              <button
                type="button"
                onClick={() => handleCopyPin(successData.pin)}
                className="text-[10px] px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-semibold transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {successData.sessionId && (
              <Link
                href={`/dashboard/owner/session/${successData.sessionId}`}
                className="text-xs font-bold text-neutral-200 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Live Monitor</span>
                <span>&rarr;</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
