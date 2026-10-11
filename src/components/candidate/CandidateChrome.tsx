import Link from "next/link";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CA"
  );
}

export function CandidateTopbar({ candidateName, roll }: { candidateName: string; roll: string }) {
  return (
    <header className="h-14 shrink-0 border-b border-white/10 bg-[#060607] px-4 sm:px-6 flex items-center gap-3 relative z-40">
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <span className="font-black text-[19px] tracking-tight text-white leading-none uppercase">
          APTIX <span className="text-lime-300">✳</span>
        </span>
        <span className="hidden sm:block w-px h-5 bg-white/15" />
        <span className="hidden sm:block text-[11px] font-medium text-neutral-400">Assessment Platform</span>
      </Link>
      <nav className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
        <Link href="/" className="text-[11px] font-bold text-lime-200 hover:text-lime-100 px-1 py-1 transition-colors">
          My assessments
        </Link>
        <span className="text-[10px] font-bold tracking-[0.14em] text-neutral-300 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1 uppercase">
          Northbridge University
        </span>
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-purple-500/80 border border-purple-300/30 text-white text-[11px] font-black flex items-center justify-center shrink-0">
          {initials(candidateName)}
        </span>
        <span className="hidden sm:block leading-tight">
          <span className="block text-xs font-bold text-white">{candidateName}</span>
          <span className="block text-[10px] text-neutral-500 font-mono">{roll}</span>
        </span>
      </div>
    </header>
  );
}

export function CandidateFooter() {
  return (
    <footer className="shrink-0 border-t border-white/10 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] font-medium text-neutral-600">
      <span>APTIX Assessment Platform · Northbridge University</span>
      <span>Secure session · Server time is authoritative</span>
    </footer>
  );
}
