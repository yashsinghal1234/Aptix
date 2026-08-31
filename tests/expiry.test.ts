export function runExpiryTests() {
  console.log("\n🧪 Running Attempt Expiry & Time Extension Sweeper Tests...");
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

  // Pure helper simulating sweepExpiredAttempts logic
  function isAttemptExpired(
    now: number,
    session: { startTime: number; durationMinutes: number; extendedUntil?: number | null },
    attempt: { extendedUntil?: number | null }
  ): boolean {
    const sessionHardDeadline = session.extendedUntil 
      ? session.extendedUntil 
      : session.startTime + session.durationMinutes * 60 * 1000;

    const attemptDeadline = attempt.extendedUntil 
      ? attempt.extendedUntil 
      : sessionHardDeadline;

    // 15-second grace period
    return now > attemptDeadline + 15000;
  }

  const baseStartTime = 1700000000000; // Reference timestamp
  const baseSession = {
    startTime: baseStartTime,
    durationMinutes: 60, // Ends at baseStartTime + 3,600,000 ms
    extendedUntil: null
  };

  // Case 1: Mid-exam attempt (at 30 minutes)
  const nowMid = baseStartTime + 30 * 60 * 1000;
  assert("Mid-Exam Attempt Not Expired", !isAttemptExpired(nowMid, baseSession, { extendedUntil: null }));

  // Case 2: In grace window (+5s past 60 min)
  const nowGrace = baseStartTime + 60 * 60 * 1000 + 5000;
  assert("Attempt In Grace Window (5s overdue) Not Expired", !isAttemptExpired(nowGrace, baseSession, { extendedUntil: null }));

  // Case 3: Fully expired (+20s past 60 min)
  const nowOver = baseStartTime + 60 * 60 * 1000 + 20000;
  assert("Attempt Overdue (+20s) Marked Expired", isAttemptExpired(nowOver, baseSession, { extendedUntil: null }));

  // Case 4: Candidate granted individual 15-minute extension
  const candidateExtension = baseStartTime + 75 * 60 * 1000;
  const attemptWithExt = { extendedUntil: candidateExtension };
  
  assert("Individual Extended Attempt Survives Normal Deadline", !isAttemptExpired(nowOver, baseSession, attemptWithExt));
  
  const nowPastExtension = candidateExtension + 20000;
  assert("Individual Extended Attempt Expires After Extended Deadline", isAttemptExpired(nowPastExtension, baseSession, attemptWithExt));

  // Case 5: Global Session Extension
  const globalExtension = baseStartTime + 90 * 60 * 1000;
  const sessionWithGlobalExt = { ...baseSession, extendedUntil: globalExtension };
  assert("Global Session Extension Protects Normal Attempts", !isAttemptExpired(candidateExtension, sessionWithGlobalExt, { extendedUntil: null }));

  return { passed, total };
}
