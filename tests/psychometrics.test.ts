export function runPsychometricsTests() {
  console.log("\n🧪 Running Item Psychometrics & Statistical Analysis Tests...");
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

  // 1. Difficulty Index (p-value = Total Correct / Total Attempts)
  function calculatePValue(correctCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return Number((correctCount / totalCount).toFixed(3));
  }

  assert("p-Value 80/100 candidates correct = 0.800 (Easy)", calculatePValue(80, 100) === 0.8);
  assert("p-Value 20/100 candidates correct = 0.200 (Hard)", calculatePValue(20, 100) === 0.2);
  assert("p-Value 0/50 candidates correct = 0.000 (Extreme)", calculatePValue(0, 50) === 0.0);

  // 2. Discrimination Index (D = (Upper 27% Correct - Lower 27% Correct) / Group Size)
  function calculateDiscrimination(upperCorrect: number, lowerCorrect: number, groupSize: number): number {
    if (groupSize === 0) return 0;
    return Number(((upperCorrect - lowerCorrect) / groupSize).toFixed(3));
  }

  // Good item: High scorers got it right (25/27), Low scorers missed it (5/27)
  const dGood = calculateDiscrimination(25, 5, 27);
  assert("Discrimination Index High Quality D > 0.40", dGood >= 0.4, `Got: ${dGood}`);

  // Flawed / Confusing item: Low scorers got it right more than high scorers (D < 0)
  const dFlawed = calculateDiscrimination(5, 20, 27);
  assert("Discrimination Index Negative Flags Flawed Distractor", dFlawed < 0, `Got: ${dFlawed}`);

  // 3. Distractor Distribution Breakdown
  function calculateDistractorFrequency(selections: string[], allOptions: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    allOptions.forEach(opt => counts[opt] = 0);
    selections.forEach(sel => {
      if (counts[sel] !== undefined) counts[sel]++;
      else counts[sel] = 1;
    });
    return counts;
  }

  const opts = ["A", "B", "C", "D"];
  const candSelections = ["A", "A", "A", "B", "C", "A"];
  const distCounts = calculateDistractorFrequency(candSelections, opts);
  assert("Distractor Frequency Option A count = 4", distCounts["A"] === 4);
  assert("Distractor Frequency Option D count = 0 (Unused Distractor)", distCounts["D"] === 0);

  return { passed, total };
}
