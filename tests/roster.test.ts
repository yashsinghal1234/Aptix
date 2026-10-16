import { parseRosterText } from "@/lib/roster-parser";

export function runRosterTests() {
  console.log("\n🧪 Running Session Roster Tests...");
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

  const r1 = parseRosterText("yash.2428c@example.edu\npriya@example.edu,Priya Sharma\n");
  assert("Parses email-only and email,name lines", r1.entries.length === 2 && r1.entries[1].name === "Priya Sharma");

  const r2 = parseRosterText("YASH@EXAMPLE.EDU\nyash@example.edu\nbad-line\n");
  assert("Lowercases and dedupes, skips invalid", r2.entries.length === 1 && r2.entries[0].email === "yash@example.edu" && r2.skipped === 1);

  const r3 = parseRosterText("a@test.com;b@test.com\nc@test.com\tC Name\n# comment\n\n");
  assert("Handles ; and tab separators, ignores comments", r3.entries.length === 3);

  const r4 = parseRosterText("good@example.edu\n @bad\nnot-an-email\n");
  assert("Skips malformed entries", r4.entries.length === 1 && r4.entries[0].email === "good@example.edu" && r4.skipped === 2);

  return { passed, total };
}
