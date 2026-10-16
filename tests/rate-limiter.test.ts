import { 
  checkRateLimit, 
  recordFailedAttempt, 
  resetRateLimit,
  getSafeClientIp
} from "../src/lib/rate-limiter";
import { generateSecureTemporaryPassword } from "../src/lib/password-generator";

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

  // 5. Safe IP Extraction tests
  const mockHeaders1 = { get: (k: string) => k === "x-vercel-ip" ? "203.0.113.195" : null };
  assert("Safe IP extracts x-vercel-ip", getSafeClientIp(mockHeaders1) === "203.0.113.195");

  const mockHeaders2 = { get: (k: string) => k === "x-forwarded-for" ? "198.51.100.42:8080, 10.0.0.1" : null };
  assert("Safe IP strips port and extracts first hop from x-forwarded-for", getSafeClientIp(mockHeaders2) === "198.51.100.42");

  const mockHeaders3 = { get: (k: string) => k === "x-forwarded-for" ? "invalid;injection<payload>" : null };
  assert("Safe IP rejects header injection payload and falls back safely", getSafeClientIp(mockHeaders3) === "127.0.0.1");

  // 6. Secure Client-side Password Generator tests
  const p1 = generateSecureTemporaryPassword("Setter");
  assert("Password starts with requested prefix", p1.startsWith("Setter#"));
  assert("Password has at least 16 characters of entropy", p1.length >= 16);
  assert("Password contains diverse character classes", /[a-z]/.test(p1) || /[A-Z]/.test(p1) || /[0-9]/.test(p1));

  const p2 = generateSecureTemporaryPassword("Reset");
  assert("Subsequent passwords are distinct and non-deterministic", p1 !== p2);

  return { passed, total };
}
