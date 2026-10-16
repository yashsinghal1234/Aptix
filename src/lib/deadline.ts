/**
 * Single source of truth for exam deadlines (P0).
 *
 * effectiveEnd = attempt.extendedUntil || session.extendedUntil || session.startTime||createdAt + duration
 * All server mutations must use this. Client timer is display-only.
 */

export const SUBMIT_GRACE_MS = 60 * 1000;

type SessionLike = {
  startTime?: Date | string | null;
  createdAt: Date | string;
  durationMinutes: number;
  extendedUntil?: Date | string | null;
};

type AttemptLike = {
  extendedUntil?: Date | string | null;
};

const toMs = (d: Date | string): number => new Date(d).getTime();

export function getBaseEnd(session: SessionLike): Date {
  const start = session.startTime ? toMs(session.startTime) : toMs(session.createdAt);
  return new Date(start + session.durationMinutes * 60 * 1000);
}

export function getEffectiveEnd(
  session: SessionLike,
  attempt?: AttemptLike | null
): Date {
  if (attempt?.extendedUntil) return new Date(attempt.extendedUntil);
  if (session.extendedUntil) return new Date(session.extendedUntil);
  return getBaseEnd(session);
}

export type DeadlineState = "OPEN" | "GRACE" | "CLOSED";

export function getDeadlineState(
  session: SessionLike,
  attempt: AttemptLike | null | undefined,
  now: Date = new Date()
): { state: DeadlineState; effectiveEnd: Date } {
  const effectiveEnd = getEffectiveEnd(session, attempt);
  const t = now.getTime();
  const end = effectiveEnd.getTime();
  if (t <= end) return { state: "OPEN", effectiveEnd };
  if (t <= end + SUBMIT_GRACE_MS) return { state: "GRACE", effectiveEnd };
  return { state: "CLOSED", effectiveEnd };
}

/** Clamp a submission timestamp to end+grace so late submits can't inflate time. */
export function clampSubmittedAt(
  session: SessionLike,
  attempt: AttemptLike | null | undefined,
  now: Date = new Date()
): Date {
  const effectiveEnd = getEffectiveEnd(session, attempt);
  const cap = effectiveEnd.getTime() + SUBMIT_GRACE_MS;
  return new Date(Math.min(now.getTime(), cap));
}

/** Validate proctor-entered minute extensions. Returns minutes or an error string. */
export function validateExtensionMinutes(raw: unknown, maxTotal = 180): { minutes?: number; error?: string } {
  const minutes = typeof raw === "string" || typeof raw === "number" ? parseInt(String(raw), 10) : NaN;
  if (!Number.isFinite(minutes) || isNaN(minutes)) return { error: "Extension minutes must be a number." };
  if (minutes <= 0) return { error: "Extension minutes must be greater than 0." };
  if (minutes > maxTotal) return { error: `Extension capped at ${maxTotal} minutes per action.` };
  return { minutes };
}
