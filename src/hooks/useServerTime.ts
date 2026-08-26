"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useServerTime(intervalMs = 60000) {
  const [synced, setSynced] = useState(false);
  const baseServerTimeRef = useRef<number>(Date.now());
  const basePerfTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let mounted = true;

    const syncTime = async () => {
      try {
        const t0 = performance.now();
        const res = await fetch("/api/time", { cache: "no-store" });
        if (!res.ok) throw new Error("Time sync failed");
        
        const data = await res.json();
        const t3 = performance.now();
        
        if (!mounted) return;

        const rtt = t3 - t0;
        // Server time exactly when the response was received
        const serverTimeAtT3 = data.time + (rtt / 2);
        
        baseServerTimeRef.current = serverTimeAtT3;
        basePerfTimeRef.current = t3;
        
        if (!synced) {
          setSynced(true);
        }
      } catch (error) {
        console.error("Failed to sync server time:", error);
      }
    };

    // Initial sync
    syncTime();
    
    // Periodic sync
    const intervalId = setInterval(syncTime, intervalMs);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [intervalMs, synced]);

  const getServerTime = useCallback(() => {
    if (!synced) return Date.now(); // Fallback before first sync
    return baseServerTimeRef.current + (performance.now() - basePerfTimeRef.current);
  }, [synced]);

  return { getServerTime, synced };
}
