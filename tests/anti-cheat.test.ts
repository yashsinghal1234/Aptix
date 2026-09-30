import { detectVirtualMachine } from "../src/lib/anti-cheat-detector";

export function runAntiCheatDetectorTests(): { passed: number; total: number } {
  console.log("\n🧪 Running Anti-Cheat Sandbox & VM Detector Tests...");
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

  // 1. In Node environment (no window/browser), safe fallback should be returned
  const res = detectVirtualMachine();
  assert("Safe execution without browser window", res.isVM === false);
  assert("Confidence is NONE when window is absent", res.confidence === "NONE");

  return { passed, total };
}
