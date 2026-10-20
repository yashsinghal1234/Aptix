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
      <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center overflow-hidden shrink-0 rounded-lg bg-black/40 ring-1 ring-white/10 group-hover:ring-lime-400/30 transition-all">
          <video
            src="/aptix-logo-anim.mp4"
            autoPlay
            loop
            muted
            playsInline
            poster="/logo-preview-frame.jpg"
            className="w-full h-full object-cover mix-blend-screen scale-125 pointer-events-none"
          />
        </div>
        <span className="font-black text-[19px] tracking-tight text-white leading-none uppercase group-hover:text-lime-300 transition-colors">
          APTIX
        </span>
        <span className="hidden sm:block w-px h-5 bg-white/15" />
        <span className="hidden sm:block text-[11px] font-medium text-neutral-400">Assessment Platform</span>
      </Link>
      <nav className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
        <Link href="/" className="text-[11px] font-bold text-lime-200 hover:text-lime-100 px-1 py-1 transition-colors">
          My assessments
        </Link>
        <span className="text-[10px] font-bold tracking-[0.14em] text-neutral-300 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1 uppercase">
          KIET Deemed to be University
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
      <span>APTIX Assessment Platform · KIET Deemed to be University</span>
      <span>Secure session · Server time is authoritative</span>
    </footer>
  );
}
