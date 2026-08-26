"use client";

import { useState } from "react";
import { createSessionAction } from "@/app/actions/session";

export function LaunchSessionForm({ templateId }: { templateId: string }) {
  const [loading, setLoading] = useState(false);
  const [startTimeLocal, setStartTimeLocal] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

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

    await createSessionAction(formData);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
      <input 
        type="datetime-local" 
        value={startTimeLocal}
        onChange={(e) => setStartTimeLocal(e.target.value)}
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
  );
}
