export type RosterEntry = { email: string; name: string | null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_GLOBAL_RE = /[^\s@,;|]+@[^\s@,;|]+\.[^\s@,;|]{2,}/g;
export const ROSTER_MAX_ENTRIES = 5000;

export function parseRosterText(text: string): { entries: RosterEntry[]; skipped: number } {
  const lines = text.split(/\r?\n/);
  const seen = new Map<string, RosterEntry>();
  let skipped = 0;
  for (const raw of lines.slice(0, ROSTER_MAX_ENTRIES + 1000)) {
    const line = raw.trim().replace(/^["']|["']$/g, "");
    if (!line || line.startsWith("#")) continue;
    const found = line.toLowerCase().match(EMAIL_GLOBAL_RE) || [];
    const valid = found.filter((e) => EMAIL_RE.test(e));
    if (valid.length === 0) {
      skipped++;
      continue;
    }
    let name: string | null = line;
    for (const e of valid) name = name!.split(e).join(" ");
    name = name
      .split(/[,;\t|]/)
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean)
      .join(" ")
      .slice(0, 120) || null;
    for (const email of valid) {
      if (!seen.has(email)) seen.set(email, { email, name });
      if (seen.size >= ROSTER_MAX_ENTRIES) break;
    }
    if (seen.size >= ROSTER_MAX_ENTRIES) break;
  }
  return { entries: [...seen.values()], skipped };
}
