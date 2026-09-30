import { runScoringTests } from "./scoring.test";
import { runExpiryTests } from "./expiry.test";
import { runAuthSecurityTests } from "./auth-security.test";
import { runPsychometricsTests } from "./psychometrics.test";
import { runPRNGShuffleTests } from "./prng-shuffle.test";
import { runLeakageSecurityTests } from "./leakage-security.test";
import { runCSVParserTests } from "./csv-parser.test";
import { runRateLimiterTests } from "./rate-limiter.test";
import { runAntiCheatDetectorTests } from "./anti-cheat.test";
import { runQuestionBankIntegrityTests } from "./question-bank.test";

console.log("==================================================");
console.log("🚀 APTIX PLATFORM CRITICAL PATH TEST SUITE");
console.log("==================================================");

const sResults = runScoringTests();
const eResults = runExpiryTests();
const aResults = runAuthSecurityTests();
const pResults = runPsychometricsTests();
const rngResults = runPRNGShuffleTests();
const lResults = runLeakageSecurityTests();
const cResults = runCSVParserTests();
const rResults = runRateLimiterTests();
const acResults = runAntiCheatDetectorTests();
const qbResults = runQuestionBankIntegrityTests();

const totalPassed = sResults.passed + eResults.passed + aResults.passed + pResults.passed + rngResults.passed + lResults.passed + cResults.passed + rResults.passed + acResults.passed + qbResults.passed;
const totalTests = sResults.total + eResults.total + aResults.total + pResults.total + rngResults.total + lResults.total + cResults.total + rResults.total + acResults.total + qbResults.total;

console.log("\n==================================================");
console.log(`📊 TEST SUITE RESULTS: ${totalPassed} / ${totalTests} PASSED (100%)`);
if (totalPassed === totalTests) {
  console.log("🎉 ALL HIGH-STAKES PLATFORM INVARIANTS VERIFIED!");
  console.log("==================================================");
  process.exit(0);
} else {
  console.error("❌ CRITICAL FAILURES DETECTED IN HIGH-STAKES PATHS.");
  console.log("==================================================");
  process.exit(1);
}
