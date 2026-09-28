"use client";

import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

interface ChunkedVideoProps {
  hlsSrc: string;
  fallbackSrc: string;
  isActive: boolean;
  className?: string;
}

export function ChunkedVideo({
  hlsSrc,
  fallbackSrc,
  isActive,
  className = "",
}: ChunkedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only buffer and play when this slide is active
    if (!isActive) {
      if (!video.paused) {
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
        maxBufferLength: 4, // Keep only 4 seconds buffered ahead
        maxMaxBufferLength: 6,
        lowLatencyMode: true,
        enableWorker: true,
        backBufferLength: 2,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
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
      // 3. Fallback to normal MP4
      video.src = fallbackSrc;
      video.play().catch(() => {});
    }
  }, [isActive, hlsSrc, fallbackSrc]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      loop
      muted
      playsInline
      preload={isActive ? "metadata" : "none"}
      className={`absolute inset-0 w-full h-full object-cover object-center bg-black transition-all duration-1000 ease-in-out ${className}`}
    />
  );
}
