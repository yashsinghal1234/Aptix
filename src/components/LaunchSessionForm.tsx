"use client";

import { useState } from "react";
import { createSessionAction } from "@/app/actions/session";

export function LaunchSessionForm({ templateId }: { templateId: string }) {
  const [loading, setLoading] = useState(false);
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successPin, setSuccessPin] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessPin(null);

    const formData = new FormData();
    formData.append("examId", templateId);
    formData.append("timezoneOffset", new Date().getTimezoneOffset().toString());

    if (startTimeLocal) {
      // Convert local date picker value to true ISO UTC string
      const localDate = new Date(startTimeLocal);
      if (!isNaN(localDate.getTime())) {
        formData.append("startTime", localDate.toISOString());
      }
    }

    const res = await createSessionAction(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setSuccessPin(res.pin || "Created");
      setStartTimeLocal("");
      setTimeout(() => {
        setSuccessPin(null);
      }, 7000);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-100 space-y-2">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input 
          type="datetime-local" 
          value={startTimeLocal}
          onChange={(e) => {
            setStartTimeLocal(e.target.value);
            if (error) setError(null);
          }}
          className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none flex-1 text-slate-700 font-medium"
          title="Schedule Start Time (Optional - leave empty to launch immediately)"
        />
        <button 
          type="submit"
          disabled={loading}
          className="text-xs px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-brand whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {loading ? (
            <span>Launching...</span>
          ) : (
            <>
              <span>Launch Session</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-start gap-2 animate-fadeIn">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span className="flex-1">{error}</span>
          <button 
            type="button" 
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-700 font-bold ml-1"
          >
            &times;
          </button>
        </div>
      )}

      {successPin && (
        <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
            <span>Session created! Access PIN: <strong className="font-mono font-bold tracking-wider text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded">{successPin}</strong></span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessPin(null)}
            className="text-emerald-400 hover:text-emerald-700 font-bold ml-1"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
