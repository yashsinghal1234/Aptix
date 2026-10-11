"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global root error caught:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Critical Error</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {error?.message || "A critical error occurred while rendering the application."}
            </p>
            {error?.digest && (
              <p className="text-[10px] font-mono text-neutral-600">Digest: {error.digest}</p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              Reload Application
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-lg border border-neutral-800 transition-all"
            >
              Return to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
