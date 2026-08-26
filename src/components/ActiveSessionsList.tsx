"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { setSessionStatusAction } from "@/app/actions/session";

export function ActiveSessionsList({ initialSessions }: { initialSessions: any[] }) {
  const [now, setNow] = useState(new Date());

  // Update time every second to dynamically switch SCHEDULED to LIVE
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (initialSessions.length === 0) {
    return <p className="text-slate-500 text-sm">No active exam sessions.</p>;
  }

  return (
    <div className="space-y-4">
      {initialSessions.map(session => {
        let effectiveStatus = session.status;
        const startTime = session.startTime ? new Date(session.startTime) : null;
        
        if (session.status === "SCHEDULED" && startTime && startTime <= now) {
          effectiveStatus = "LIVE";
        }

        return (
          <div key={session.id} className="flex justify-between items-center p-4 border rounded-lg border-l-4 border-l-indigo-500 bg-indigo-50/30">
            <div>
              <h3 className="font-semibold text-slate-800">{session.exam.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Status: <span className="font-medium text-indigo-700">{effectiveStatus} {session.status !== effectiveStatus ? "(Auto)" : ""}</span> | Attempts: {session._count?.attempts || 0}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link 
                href={`/dashboard/owner/session/${session.id}`}
                className="text-xs px-3 py-1.5 text-center bg-white border border-slate-200 text-slate-700 rounded font-medium hover:bg-slate-50 transition-colors"
              >
                Live Monitor
              </Link>
              {effectiveStatus === "SCHEDULED" && (
                <form action={setSessionStatusAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="status" value="LIVE" />
                  <button className="w-full text-xs px-3 py-1.5 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors">
                    Force Go Live
                  </button>
                </form>
              )}
              {effectiveStatus === "LIVE" && (
                <form action={setSessionStatusAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="status" value="COMPLETED" />
                  <button className="w-full text-xs px-3 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors">
                    End Now
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
