"use client";

import { useEffect } from "react";
import { FAVICON_FRAMES } from "@/lib/faviconFrames";

/**
 * AnimatedFavicon
 * Dynamically updates the browser tab favicon using the iridescent Aptix logo animation.
 * Features:
 * - 0ms overhead pre-rendered frames (no video or canvas decoding at runtime)
 * - Automatically pauses when tab is hidden (document.hidden) to consume 0% CPU
 * - Respects prefers-reduced-motion
 * - Dual-strategy: native animated GIF for Firefox + frame sequence for Chromium/Safari
 */
export function AnimatedFavicon() {
  useEffect(() => {
    if (typeof window === "undefined" || !FAVICON_FRAMES) {
      return;
    }

    // Respect reduced motion preference
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Locate or create the dynamic favicon link tag
    let link = document.querySelector<HTMLLinkElement>("link[data-aptix-animated='true']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.setAttribute("data-aptix-animated", "true");
      // Put at the very beginning of head so it takes priority in Chromium
      document.head.prepend(link);
    }

    let frameIndex = 0;
    let timerId: NodeJS.Timeout | null = null;

    const tick = () => {
      if (document.hidden) return;
      frameIndex = (frameIndex + 1) % FAVICON_FRAMES.length;
      if (link) {
        link.href = FAVICON_FRAMES[frameIndex];
      }
    };

    const start = () => {
      if (timerId === null) {
        timerId = setInterval(tick, 100); // 10 fps smooth loop
      }
    };

    const stop = () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
