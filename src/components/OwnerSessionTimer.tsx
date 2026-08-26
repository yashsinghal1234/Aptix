"use client";

import React, { useState, useEffect, useRef } from "react";

import { useServerTime } from "@/hooks/useServerTime";

export function OwnerSessionTimer({ 
  sessionId, 
  startTime, 
  durationMinutes, 
  extendedUntil, 
  status
}: { 
  sessionId: string;
  startTime: Date | null;
  durationMinutes: number;
  extendedUntil: Date | null;
  status: string;
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const endSessionCalled = useRef(false);
  
  const { getServerTime, synced } = useServerTime();

  useEffect(() => {
    if (status === "COMPLETED" || !startTime || !synced) {
      if (!startTime || !synced) setTimeLeft(null);
      return;
    }

    const start = new Date(startTime).getTime();
    let end = start + durationMinutes * 60 * 1000;
    if (extendedUntil) {
      end = new Date(extendedUntil).getTime();
    }

    const calculateTime = () => {
      const now = getServerTime();
      if (now < end) {
        setTimeLeft(Math.floor((end - now) / 1000));
      } else {
        setTimeLeft(0);
        if (!hasEnded && !endSessionCalled.current) {
          endSessionCalled.current = true;
          setHasEnded(true);
          // Auto submit form
          const form = document.getElementById('auto-end-session-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationMinutes, extendedUntil, status, hasEnded, synced, getServerTime]);

  if (status === "COMPLETED") {
    return <span className="font-mono text-slate-400 text-xs font-bold">Ended</span>;
  }

  if (timeLeft === null) {
    return <span className="font-mono text-slate-400 text-xs">Waiting</span>;
  }

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  
  return (
    <span className={`font-mono font-black text-xs ${timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
      {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
    </span>
  );
}
