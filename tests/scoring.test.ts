import { gradeResponse } from "../src/lib/scoring";

export function runScoringTests() {
  console.log("\n🧪 Running Scoring Logic Tests...");
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

  // 1. MCQ Single
  const mcqSingleQ = {
    type: "MCQ_SINGLE",
    points: 2.0,
    negativePoints: 0.5,
    answerData: JSON.stringify({ correctAnswer: "Option B" })
  };

  const r1 = gradeResponse(mcqSingleQ, "Option B");
  assert("MCQ Single Correct", r1.isCorrect && r1.earnedPoints === 2.0, `Got points: ${r1.earnedPoints}`);

  const r2 = gradeResponse(mcqSingleQ, "Option A");
  assert("MCQ Single Incorrect Negative Penalty", !r2.isCorrect && r2.earnedPoints === -0.5, `Got points: ${r2.earnedPoints}`);

  const r3 = gradeResponse(mcqSingleQ, "");
  assert("MCQ Single Blank Response No Penalty", !r3.isCorrect && r3.earnedPoints === 0, `Got points: ${r3.earnedPoints}`);

  // 2. Numeric with Tolerance
  const numericQ = {
    type: "NUMERIC",
    points: 3.0,
    negativePoints: 1.0,
    answerData: JSON.stringify({ exact: 50.0, tolerance: 0.5 })
  };

  const n1 = gradeResponse(numericQ, "50.0");
  assert("Numeric Exact Match", n1.isCorrect && n1.earnedPoints === 3.0);

  const n2 = gradeResponse(numericQ, "50.4");
  assert("Numeric Within Tolerance Upper Boundary", n2.isCorrect && n2.earnedPoints === 3.0);

  const n3 = gradeResponse(numericQ, "49.6");
  assert("Numeric Within Tolerance Lower Boundary", n3.isCorrect && n3.earnedPoints === 3.0);

  const n4 = gradeResponse(numericQ, "50.8");
  assert("Numeric Beyond Tolerance Rejected", !n4.isCorrect && n4.earnedPoints === -1.0);

  // 3. Multi-Correct MCQ
  const multiQ = {
    type: "MCQ_MULTI",
    points: 4.0,
    negativePoints: 1.0,
    answerData: JSON.stringify({ correctAnswers: ["Option A", "Option C"] })
  };

  const m1 = gradeResponse(multiQ, JSON.stringify(["Option A", "Option C"]));
  assert("Multi-Correct Exact Set Match", m1.isCorrect && m1.earnedPoints === 4.0);

  const m2 = gradeResponse(multiQ, JSON.stringify(["Option A"]));
  assert("Multi-Correct Partial Set Incomplete", !m2.isCorrect && m2.earnedPoints === -1.0);

  const m3 = gradeResponse(multiQ, JSON.stringify(["Option A", "Option B", "Option C"]));
  assert("Multi-Correct Distractor Included", !m3.isCorrect && m3.earnedPoints === -1.0);

  // 4. Fill in the Blanks with Partial Credit
  const fillBlankQ = {
    type: "FILL_BLANK",
    points: 2.0,
    negativePoints: 0.5,
    answerData: JSON.stringify({
      partialCredit: true,
      blanks: {
        "1": { accepted: ["Paris", "paris "], points: 1.0, caseSensitive: false },
        "2": { accepted: ["Euro"], points: 1.0, caseSensitive: true }
      }
    })
  };

  const f1 = gradeResponse(fillBlankQ, JSON.stringify({ "1": "Paris", "2": "Euro" }));
  assert("Fill Blank Full Match", f1.isCorrect && f1.earnedPoints === 2.0, `Got points: ${f1.earnedPoints}`);

  const f2 = gradeResponse(fillBlankQ, JSON.stringify({ "1": "paris", "2": "Dollar" }));
  assert("Fill Blank Partial Credit (1 of 2 Correct)", f2.isCorrect && f2.earnedPoints === 1.0, `Got points: ${f2.earnedPoints}`);

  const f3 = gradeResponse(fillBlankQ, JSON.stringify({ "1": "Lyon", "2": "euro" })); // 'euro' wrong case
  assert("Fill Blank Case Sensitivity Enforcement", !f3.isCorrect && f3.earnedPoints === 0, `Got points: ${f3.earnedPoints}`);

  return { passed, total };
}
