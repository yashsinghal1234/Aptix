"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface ChunkedVideoProps {
  hlsSrc: string;
  fallbackSrc: string;
  poster: string;
  isActive: boolean;
  isLowNetwork?: boolean;
  className?: string;
}

export function ChunkedVideo({
  hlsSrc,
  fallbackSrc,
  poster,
  isActive,
  isLowNetwork = false,
  className = "",
}: ChunkedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  useEffect(() => {
    // If user is on 2G / low network, skip video loading entirely to preserve bandwidth
    if (isLowNetwork) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Only load and buffer video when slide is active (saves ~75% initial bandwidth)
    if (!isActive) {
      if (video && !video.paused) {
        video.pause();
      }
      return;
    }

    // 1. Native HLS support (Safari iOS / macOS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSrc;
      video.play().catch(() => {});
      return;
    }

    // 2. Hls.js chunked streaming (Chrome, Firefox, Edge, Android)
    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        maxBufferLength: 4, // Keep only 4 seconds in buffer ahead (low bandwidth & low memory footprint)
        maxMaxBufferLength: 6,
        lowLatencyMode: true,
        enableWorker: true,
        backBufferLength: 2,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setHasStartedPlaying(true)).catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover from transient college network drops
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              // Fallback to static MP4 if HLS fails
              hls.destroy();
              hlsRef.current = null;
              if (video) {
                video.src = fallbackSrc;
                video.play().catch(() => {});
              }
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else {
      // 3. Browser does not support HLS -> fallback to normal MP4
      video.src = fallbackSrc;
      video.play().catch(() => {});
    }
  }, [isActive, isLowNetwork, hlsSrc, fallbackSrc]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Low Network (2G / Data Saver) Fallback: Render static poster with cinematic slow-motion effect
  if (isLowNetwork) {
    return (
      <div
        className={`absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-1000 ease-out ${className}`}
        style={{
          backgroundImage: `url(${poster})`,
          transform: isActive ? "scale(1.04)" : "scale(1.0)",
          transition: "transform 8s ease-out, opacity 1s ease-in-out",
        }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      loop
      muted
      playsInline
      poster={poster}
      preload={isActive ? "metadata" : "none"}
      className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out ${className}`}
    />
  );
}
