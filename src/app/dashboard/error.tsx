"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Runtime Error]", error);
  }, [error]);

  const isDatabaseError =
    error.message?.toLowerCase().includes("database") ||
    error.message?.toLowerCase().includes("prisma") ||
    error.message?.toLowerCase().includes("reach database server");

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900/90 border border-neutral-800 backdrop-blur-xl p-8 rounded-2xl shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isDatabaseError ? "Database Connection Interrupted" : "Something Went Wrong"}
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {isDatabaseError
              ? "The database is either waking up from sleep or the network connection was briefly interrupted. Please retry."
              : "An unexpected error occurred while loading this dashboard view."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
          <Link
            href="/dashboard/owner"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold rounded-xl border border-neutral-700 transition"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
