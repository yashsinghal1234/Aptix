"use client";

import React, { useState, useEffect } from "react";

export function LiveSparkline({ className = "" }: { className?: string }) {
  const width = 120;
  const height = 30;
  // Baseline initial progression
  const defaultY = [26, 24, 25, 20, 21, 18, 19, 15, 16, 12, 14, 10, 11, 8, 9, 6, 7, 5, 6, 5];

  const [data, setData] = useState<number[]>(defaultY);
  const [liveLatency, setLiveLatency] = useState(14);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setData((prev) => {
        const last = prev[prev.length - 1];
        // Realistic subtle telemetry jitter with slight mean-reversion between 4 and 18
        const delta = (Math.random() - 0.48) * 3.8;
        let next = Math.round(last + delta);
        if (next < 4) next = 4 + Math.round(Math.random() * 2);
        if (next > 19) next = 17 - Math.round(Math.random() * 2);

        return [...prev.slice(1), next];
      });

      setLiveLatency(Math.floor(12 + Math.random() * 7));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const stepX = width / (data.length - 1);
  const points = data.map((y, idx) => `${(idx * stepX).toFixed(1)},${y}`).join(" ");
  const lastX = width;
  const lastY = data[data.length - 1];
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className={`relative mt-2 ${className}`}>
      {/* Live status indicators */}
      <div className="flex items-center justify-between text-[9px] font-mono mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400"></span>
          </span>
          <span className="text-lime-300 font-bold tracking-wider uppercase text-[9px]">Live Telemetry</span>
        </div>
        <span className="text-neutral-400 tabular-nums font-semibold">
          {mounted ? `~${liveLatency}ms latency` : "healthy"}
        </span>
      </div>

      {/* SVG Canvas with glowing polyline and live pulse */}
      <div className="relative overflow-hidden rounded-xl bg-black/60 border border-white/[0.08] p-2 backdrop-blur-sm shadow-inner shadow-black/80">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-10 overflow-visible"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="live-spark-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bef264" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#bef264" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
            </linearGradient>
            <filter id="spark-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.9" floodColor="#bef264" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* Reference grid ticks */}
          <line x1="0" y1="28" x2={width} y2="28" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
          <line x1="0" y1="15" x2={width} y2="15" stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2" strokeWidth="0.6" />

          {/* Area glow fill */}
          <polygon points={areaPoints} fill="url(#live-spark-glow)" />

          {/* Live animated polyline */}
          <polyline
            points={points}
            fill="none"
            stroke="#bef264"
            strokeWidth="1.7"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#spark-glow)"
            className="transition-all duration-300 ease-linear"
          />

          {/* Live pulsing tip dot */}
          {mounted && (
            <>
              <circle
                cx={lastX}
                cy={lastY}
                r="3.8"
                fill="#bef264"
                className="animate-ping opacity-60"
              />
              <circle
                cx={lastX}
                cy={lastY}
                r="2"
                fill="#ffffff"
                stroke="#bef264"
                strokeWidth="1.2"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
