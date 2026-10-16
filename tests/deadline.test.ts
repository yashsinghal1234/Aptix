import { getEffectiveEnd, getDeadlineState, clampSubmittedAt, validateExtensionMinutes } from "../src/lib/deadline";

export function runDeadlineTests() {
  console.log("\n🧪 Running Deadline Invariant Tests...");
  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ""}`);
    }
  }

  const start = new Date("2026-10-01T09:00:00Z");
  const session = { startTime: start, createdAt: start, durationMinutes: 60, extendedUntil: null };

  assert("Base end = start + duration", getEffectiveEnd(session, null).getTime() === start.getTime() + 3600_000);

  const attExt = { extendedUntil: new Date(start.getTime() + 90 * 60000) };
  assert("Attempt extension wins", getEffectiveEnd(session, attExt).getTime() === start.getTime() + 90 * 60000);

  const sessExt = { ...session, extendedUntil: new Date(start.getTime() + 120 * 60000) };
  assert("Session extension used without attempt extension", getEffectiveEnd(sessExt, null).getTime() === start.getTime() + 120 * 60000);
  assert("Attempt extension beats session extension", getEffectiveEnd(sessExt, attExt).getTime() === start.getTime() + 90 * 60000);

  assert("OPEN before end", getDeadlineState(session, null, new Date(start.getTime() + 30 * 60000)).state === "OPEN");
  assert("GRACE within 60s after end", getDeadlineState(session, null, new Date(start.getTime() + 60 * 60000 + 30_000)).state === "GRACE");
  assert("CLOSED after grace", getDeadlineState(session, null, new Date(start.getTime() + 60 * 60000 + 61_000)).state === "CLOSED");

  const clamped = clampSubmittedAt(session, null, new Date(start.getTime() + 7200_000));
  assert("SubmittedAt clamped to end+grace", clamped.getTime() === start.getTime() + 3660_000);

  assert("Reject NaN minutes", !!validateExtensionMinutes("abc").error);
  assert("Reject zero/negative minutes", !!validateExtensionMinutes("0").error && !!validateExtensionMinutes("-5").error);
  assert("Cap excessive minutes", !!validateExtensionMinutes("500", 120).error);
  assert("Accept valid minutes", validateExtensionMinutes("15", 120).minutes === 15);

  return { passed, total };
}
