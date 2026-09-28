"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setSessionStatusAction } from "@/app/actions/session";

export function ActiveSessionsList({ initialSessions }: { initialSessions: any[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [now, setNow] = useState(new Date());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"END" | "GO_LIVE" | null>(null);

  // Keep sessions synced with server props
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  // Update time every second to dynamically switch SCHEDULED to LIVE
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEndSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to conclude this assessment session? Active candidate submissions will be finalized.")) {
      return;
    }

    setLoadingId(sessionId);
    setActionType("END");
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("status", "COMPLETED");

      const res = await setSessionStatusAction(formData);
      if (res?.success) {
        // Optimistically remove from active list
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        router.refresh();
      } else {
        alert(res?.error || "Failed to end session. Please try again.");
      }
    } catch (err) {
      console.error("Error ending session:", err);
      alert("An unexpected error occurred while ending the session.");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleGoLive = async (sessionId: string) => {
    setLoadingId(sessionId);
    setActionType("GO_LIVE");
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("status", "LIVE");

      const res = await setSessionStatusAction(formData);
      if (res?.success) {
        // Optimistically mark as live
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: "LIVE", startTime: new Date().toISOString() } : s));
        router.refresh();
      } else {
        alert(res?.error || "Failed to start session. Please try again.");
      }
    } catch (err) {
      console.error("Error starting session:", err);
      alert("An unexpected error occurred while starting the session.");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="py-12 px-6 flex flex-col items-center justify-center text-center rounded-2xl bg-neutral-900/20 border border-dashed border-neutral-800/80">
        <div className="w-11 h-11 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3 text-neutral-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-white mb-1">No Active Sessions</h4>
        <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
          Assessments launched from your templates will appear here with live candidate counts and proctoring controls.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map(session => {
        let effectiveStatus = session.status;
        const startTime = session.startTime ? new Date(session.startTime) : null;
        
        if (session.status === "SCHEDULED" && startTime && startTime <= now) {
          effectiveStatus = "LIVE";
        }

        const isLive = effectiveStatus === "LIVE";
        const isSessionLoading = loadingId === session.id;

        return (
          <div key={session.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition-all ${
            isLive ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' : 'bg-[#0d0f14]/60 border-neutral-800 hover:border-neutral-700 hover:bg-[#12151d]'
          }`}>
            <div className="mb-3 sm:mb-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isLive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                }`}>
                  {effectiveStatus} {session.status !== effectiveStatus ? "(Auto-Live)" : ""}
                </span>
                {session.pin && (
                  <span 
                    onClick={() => navigator.clipboard.writeText(session.pin)}
                    title="Click to copy PIN"
                    className="cursor-pointer text-[10px] font-mono font-extrabold bg-neutral-900 text-neutral-200 px-2 py-0.5 rounded-md border border-neutral-700 hover:border-neutral-500 transition-colors flex items-center gap-1 select-none"
                  >
                    <span>PIN: {session.pin}</span>
                    <svg className="w-3 h-3 opacity-70 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </span>
                )}
                {session.allowedEmailDomain && (
                  <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                    @{session.allowedEmailDomain.replace(/^@/, '')}
                  </span>
                )}
                <span className="text-xs text-neutral-600 font-medium">|</span>
                <span className="text-xs text-neutral-400 font-bold">{session._count?.attempts || 0} Candidates</span>
              </div>
              <h3 className="font-bold text-white text-sm capitalize">{session.exam.title}</h3>
              {startTime && (
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Scheduled: {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({startTime.toLocaleDateString()})
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link 
                href={`/dashboard/owner/session/${session.id}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 text-center text-xs px-4 py-2 bg-white border border-white text-black rounded-xl font-bold hover:bg-neutral-200 transition-all shadow-md cursor-pointer select-none"
              >
                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                <span>Live Monitor</span>
                <span className="text-[11px]">&rarr;</span>
              </Link>

              {effectiveStatus === "SCHEDULED" && (
                <button 
                  type="button"
                  disabled={isSessionLoading}
                  onClick={() => handleGoLive(session.id)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer select-none"
                >
                  {isSessionLoading && actionType === "GO_LIVE" ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Starting...</span>
                    </>
                  ) : (
                    <span>Go Live</span>
                  )}
                </button>
              )}

              {effectiveStatus === "LIVE" && (
                <button 
                  type="button"
                  disabled={isSessionLoading}
                  onClick={() => handleEndSession(session.id)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer select-none"
                >
                  {isSessionLoading && actionType === "END" ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin text-rose-300" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Ending...</span>
                    </>
                  ) : (
                    <span>End Session</span>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
