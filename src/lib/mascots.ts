export interface Mascot {
  id: string;
  name: string;
  emoji: string;
  gifUrl: string;
  title: string;
  tagline: string;
  gradient: string;
  borderGlow: string;
  badgeClass: string;
  accentColor: string;
  /** Optional per-character framing fix (zoom/crop). Falls back to the default card fit. */
  imgZoom?: number;
  imgOrigin?: string;
}

export const MASCOTS: Mascot[] = [
  {
    id: "IRON_MAN",
    name: "Iron Man",
    emoji: "🤖",
    gifUrl: "/characters/ironman.gif",
    title: "Genius Arc",
    tagline: "Genius arc 3000% computational intellect",
    gradient: "from-amber-500/20 via-red-500/10 to-transparent",
    borderGlow: "border-red-500/40 hover:border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.25)]",
    badgeClass: "bg-red-500/15 text-red-300 border-red-500/40",
    accentColor: "#ef4444",
  },
  {
    id: "MICHAEL_JACKSON",
    name: "Smooth Criminal",
    emoji: "🕺",
    gifUrl: "/characters/michael_jackson.gif",
    title: "Moonwalk Rhythm",
    tagline: "Moonwalk rhythm effortless flow under pressure",
    gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
    borderGlow: "border-indigo-400/40 hover:border-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.25)]",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-400/40",
    accentColor: "#818cf8",
  },
  {
    id: "MADARA_UCHIHA",
    name: "Madara Uchiha",
    emoji: "🔥",
    gifUrl: "/characters/madara.gif",
    title: "Susanoo Dominance",
    tagline: "Susanoo dominance unrivaled mastery & focus",
    gradient: "from-purple-600/20 via-rose-600/10 to-transparent",
    borderGlow: "border-purple-500/40 hover:border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.25)]",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/40",
    accentColor: "#a855f7",
    // Sprite sits small at bottom-left of a wide canvas — zoom into it.
    imgZoom: 2.2,
    imgOrigin: "12% 82%",
  },
  {
    id: "DEADPOOL",
    name: "Deadpool",
    emoji: "⚔️",
    gifUrl: "/characters/deadpool.gif",
    title: "Maximum Effort",
    tagline: "Maximum effort fearless speed and precision",
    gradient: "from-rose-600/20 via-red-600/10 to-transparent",
    borderGlow: "border-rose-500/40 hover:border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.25)]",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    accentColor: "#f43f5e",
  },
  {
    id: "COURAGE_DOG",
    name: "Courage",
    emoji: "🐶",
    gifUrl: "/characters/courage.gif",
    title: "Pure Heart",
    tagline: "Courage in the face of fear bravery when it counts",
    gradient: "from-pink-500/20 via-purple-500/10 to-transparent",
    borderGlow: "border-pink-500/40 hover:border-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.25)]",
    badgeClass: "bg-pink-500/15 text-pink-300 border-pink-500/40",
    accentColor: "#ec4899",
  },
  {
    id: "SPIDER_MAN",
    name: "Spider-Man",
    emoji: "🕷️",
    gifUrl: "/characters/spiderman.gif",
    title: "Web Slinger",
    tagline: "Spider-Sense agility rapid problem-solving & reflexes",
    gradient: "from-red-600/20 via-sky-600/10 to-transparent",
    borderGlow: "border-sky-500/40 hover:border-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.25)]",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    accentColor: "#0ea5e9",
    imgZoom: 2.3,
    imgOrigin: "47% 76%",
  },
  {
    id: "LUFFY",
    name: "Monkey D. Luffy",
    emoji: "🍖",
    gifUrl: "/characters/luffy.gif",
    title: "Future Pirate King",
    tagline: "Gomu-Gomu resilience boundless stamina & grit",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    borderGlow: "border-amber-400/40 hover:border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.25)]",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-400/40",
    accentColor: "#f59e0b",
    imgZoom: 1.85,
    imgOrigin: "50% 68%",
  },
  {
    id: "JOHN_WICK",
    name: "John Wick",
    emoji: "🎯",
    gifUrl: "/characters/john_wick.gif",
    title: "Baba Yaga",
    tagline: "Unmatched focus & will absolute precision on every problem",
    gradient: "from-slate-600/20 via-zinc-600/10 to-transparent",
    borderGlow: "border-slate-400/40 hover:border-slate-300 shadow-[0_0_25px_rgba(148,163,184,0.25)]",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-400/40",
    accentColor: "#94a3b8",
    imgZoom: 1.35,
    imgOrigin: "60% 50%",
  },
  {
    id: "STAR_WARS",
    name: "Vader & Luke",
    emoji: "⚔️",
    gifUrl: "/characters/vader.gif",
    title: "Force Duel",
    tagline: "Balance of the Force supreme composure in the ultimate trial",
    gradient: "from-cyan-600/20 via-red-600/10 to-transparent",
    borderGlow: "border-cyan-400/40 hover:border-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.25)]",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-400/40",
    accentColor: "#06b6d4",
    imgZoom: 1.35,
    imgOrigin: "50% 65%",
  },
  {
    id: "BOXER",
    name: "The Contender",
    emoji: "🥊",
    gifUrl: "/characters/boxer.gif",
    title: "Knockout Drive",
    tagline: "Tenacious contender unyielding resilience in the final rounds",
    gradient: "from-amber-600/20 via-red-600/10 to-transparent",
    borderGlow: "border-amber-500/40 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    accentColor: "#f59e0b",
    imgZoom: 1.45,
    imgOrigin: "45% 65%",
  },
];

/** Legacy ids from previous mascot sets resolve to their closest match. */
const LEGACY_ALIASES: Record<string, string> = {
  CYBER_LION: "IRON_MAN",
  QUANTUM_SPARK: "MICHAEL_JACKSON",
  PHOENIX_NOVA: "MADARA_UCHIHA",
  NEON_WOLF: "DEADPOOL",
  TECHNO_OWL: "IRON_MAN",
  ASTRO_BEAR: "COURAGE_DOG",
  APEX_DRAGON: "MADARA_UCHIHA",
  FALCON_ROCKET: "IRON_MAN",
  NOVA_FOX: "DEADPOOL",
  SYNTH_BOT: "IRON_MAN",
  IRON_HAWK: "IRON_MAN",
  ASTRAL_PHOENIX: "MADARA_UCHIHA",
  TONY_STARK: "IRON_MAN",
  IRONMAN: "IRON_MAN",
  MJ: "MICHAEL_JACKSON",
  SMOOTH_CRIMINAL: "MICHAEL_JACKSON",
  MADARA: "MADARA_UCHIHA",
  UCHIHA: "MADARA_UCHIHA",
  WADE_WILSON: "DEADPOOL",
  COURAGE: "COURAGE_DOG",
  COWARDLY_DOG: "COURAGE_DOG",
  DOG: "COURAGE_DOG",
  SPIDERMAN: "SPIDER_MAN",
  PETER_PARKER: "SPIDER_MAN",
  SPIDEY: "SPIDER_MAN",
  MONKEY_D_LUFFY: "LUFFY",
  STRAW_HAT: "LUFFY",
  WICK: "JOHN_WICK",
  KEANU: "JOHN_WICK",
  BABA_YAGA: "JOHN_WICK",
  VADER: "STAR_WARS",
  DARTH_VADER: "STAR_WARS",
  LUKE: "STAR_WARS",
  LUKE_SKYWALKER: "STAR_WARS",
  JEDI: "STAR_WARS",
  PANDA: "COURAGE_DOG",
  PO: "COURAGE_DOG",
  DRAGON_WARRIOR: "COURAGE_DOG",
  KUNGFU_PANDA: "COURAGE_DOG",
  TRUMP: "BOXER",
  DONALD_TRUMP: "BOXER",
  FIGHTER: "BOXER",
  CONTENDER: "BOXER",
};

export function getMascotById(id?: string | null): Mascot {
  if (!id) return MASCOTS[0];
  const trimmed = id.trim();
  const key = LEGACY_ALIASES[trimmed] || LEGACY_ALIASES[trimmed.toUpperCase()] || trimmed;
  const found = MASCOTS.find(
    (m) =>
      m.id === key ||
      m.id.toLowerCase() === key.toLowerCase() ||
      m.name.toLowerCase() === key.toLowerCase() ||
      m.emoji === trimmed ||
      m.gifUrl === trimmed ||
      m.gifUrl.toLowerCase().includes(trimmed.toLowerCase())
  );
  return found || MASCOTS[0];
}
