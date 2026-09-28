"use client";

import { useState } from "react";
import { createSessionAction } from "@/app/actions/session";
import Link from "next/link";

export function LaunchSessionForm({ templateId }: { templateId: string }) {
  const [loading, setLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ pin: string; sessionId?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLaunch = async (scheduledTime?: string) => {
    setLoading(true);
    setError(null);
    setSuccessData(null);

    const formData = new FormData();
    formData.append("examId", templateId);
    formData.append("timezoneOffset", new Date().getTimezoneOffset().toString());

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
      setSuccessData({ pin: res.pin || "Created", sessionId: res.sessionId });
      setStartTimeLocal("");
      setShowSchedule(false);
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-2.5 mt-2.5 border-t border-neutral-800/60 space-y-2.5">
      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300 font-semibold">Session Created!</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessData(null)}
              className="text-emerald-400 hover:text-white font-bold text-xs"
            >
              &times;
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap bg-black/60 p-2 rounded-lg border border-emerald-900/40">
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
                className="text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1 transition-colors"
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
