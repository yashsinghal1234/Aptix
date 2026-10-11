export interface Mascot {
  id: string;
  name: string;
  emoji: string;
  title: string;
  tagline: string;
  gradient: string;
  borderGlow: string;
  badgeClass: string;
  accentColor: string;
}

export const MASCOTS: Mascot[] = [
  {
    id: "CYBER_LION",
    name: "Cyber Lion",
    emoji: "🦁",
    title: "Courage Roar",
    tagline: "Courage roar · 100 confidence vibes",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    borderGlow: "border-amber-500/40 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    accentColor: "#f59e0b",
  },
  {
    id: "QUANTUM_SPARK",
    name: "Quantum Spark",
    emoji: "⚡",
    title: "Focus Charge",
    tagline: "Focus charge · light up your thinking",
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    borderGlow: "border-sky-400/40 hover:border-sky-300 shadow-[0_0_25px_rgba(56,189,248,0.2)]",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-400/40",
    accentColor: "#38bdf8",
  },
  {
    id: "PHOENIX_NOVA",
    name: "Phoenix Nova",
    emoji: "🔥",
    title: "Reset Energy",
    tagline: "Reset energy · rise after a tough question",
    gradient: "from-orange-500/20 via-rose-500/10 to-transparent",
    borderGlow: "border-orange-400/40 hover:border-orange-300 shadow-[0_0_25px_rgba(251,146,60,0.2)]",
    badgeClass: "bg-orange-500/15 text-orange-300 border-orange-400/40",
    accentColor: "#fb923c",
  },
  {
    id: "NEON_WOLF",
    name: "Neon Wolf",
    emoji: "🐺",
    title: "Instinct Mode",
    tagline: "Instinct mode · follow your own pace",
    gradient: "from-slate-500/20 via-zinc-500/10 to-transparent",
    borderGlow: "border-slate-400/40 hover:border-slate-300 shadow-[0_0_25px_rgba(148,163,184,0.2)]",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-400/40",
    accentColor: "#94a3b8",
  },
  {
    id: "TECHNO_OWL",
    name: "Techno Owl",
    emoji: "🦉",
    title: "Clarity Lens",
    tagline: "Clarity lens · calm, considered choices",
    gradient: "from-amber-600/20 via-yellow-600/10 to-transparent",
    borderGlow: "border-yellow-500/40 hover:border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.2)]",
    badgeClass: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
    accentColor: "#eab308",
  },
  {
    id: "ASTRO_BEAR",
    name: "Astro Bear",
    emoji: "🐻",
    title: "Cosmic Composure",
    tagline: "Cosmic composure · grounded under pressure",
    gradient: "from-amber-700/20 via-orange-800/10 to-transparent",
    borderGlow: "border-amber-600/40 hover:border-amber-500 shadow-[0_0_25px_rgba(180,83,9,0.25)]",
    badgeClass: "bg-amber-600/15 text-amber-400 border-amber-600/40",
    accentColor: "#d97706",
  },
];

/** Legacy ids from the previous 8-mascot set resolve to their closest match. */
const LEGACY_ALIASES: Record<string, string> = {
  APEX_DRAGON: "PHOENIX_NOVA",
  FALCON_ROCKET: "QUANTUM_SPARK",
  NOVA_FOX: "NEON_WOLF",
  SYNTH_BOT: "TECHNO_OWL",
  IRON_HAWK: "ASTRO_BEAR",
  ASTRAL_PHOENIX: "PHOENIX_NOVA",
};

export function getMascotById(id?: string | null): Mascot {
  if (!id) return MASCOTS[0];
  const key = LEGACY_ALIASES[id] || id;
  const found = MASCOTS.find((m) => m.id === key || m.name.toLowerCase() === id.toLowerCase());
  return found || MASCOTS[0];
}
