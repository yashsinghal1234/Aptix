import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../src/lib/rate-limiter";

export function runRateLimiterTests(): { passed: number; total: number } {
  console.log("\n🧪 Running Rate Limiter & Anti-Brute-Force Tests...");
  let passed = 0;
  let total = 0;

  function assert(desc: string, cond: boolean) {
    total++;
    if (cond) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  }

  const testId = "test-user-ip-123";
  resetRateLimit(testId);

  // 1. Initial attempt is allowed
  assert("Initial check is allowed", checkRateLimit(testId).allowed === true);

  // 2. 4 failed attempts still allow next attempt
  for (let i = 0; i < 4; i++) {
    recordFailedAttempt(testId);
  }
  assert("4 failed attempts still allowed", checkRateLimit(testId).allowed === true);

  // 3. 5th failed attempt triggers rate limit block
  recordFailedAttempt(testId);
  const blocked = checkRateLimit(testId);
  assert("5th failed attempt blocks further tries", blocked.allowed === false);
  assert("Block reports positive retry-after seconds", blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 300);

  // 4. Successful login resets the rate limit
  resetRateLimit(testId);
  assert("Reset rate limit allows immediate retry", checkRateLimit(testId).allowed === true);

  return { passed, total };
}
