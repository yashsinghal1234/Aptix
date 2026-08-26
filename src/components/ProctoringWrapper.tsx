"use client";

import { useEffect, useState, ReactNode } from "react";

interface ProctoringWrapperProps {
  children: ReactNode;
}

export default function ProctoringWrapper({ children }: ProctoringWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warnings, setWarnings] = useState(0);

  useEffect(() => {
    // Basic Lockdown: Disable copy/paste, right-click
    const disableEvents = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", disableEvents);
    document.addEventListener("copy", disableEvents);
    document.addEventListener("paste", disableEvents);
    document.addEventListener("cut", disableEvents);

    // Tab tracking / Visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings((prev) => prev + 1);
        alert("Warning: You switched tabs or minimized the browser. This action has been recorded.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Fullscreen change detection
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("contextmenu", disableEvents);
      document.removeEventListener("copy", disableEvents);
      document.removeEventListener("paste", disableEvents);
      document.removeEventListener("cut", disableEvents);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable full-screen mode:", err.message);
      });
    }
  };

  if (!isFullscreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-700">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Security Check</h1>
          <p className="mb-6 text-gray-300">
            This aptitude test requires full-screen mode, and strict monitoring is enabled. 
            Navigating away, opening new tabs, or copying content will result in termination.
          </p>
          <button
            onClick={requestFullscreen}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Start Exam in Fullscreen
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {warnings > 0 && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-1 z-50 text-sm font-semibold shadow-md">
          Warning: Suspicious activity detected ({warnings} infractions recorded)
        </div>
      )}
      {children}
    </>
  );
}
