import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center justify-center mx-auto text-xl font-bold font-mono">
          404
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">Page Not Found</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <div className="flex justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg transition-all"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
