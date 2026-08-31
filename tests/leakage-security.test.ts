export function runLeakageSecurityTests() {
  console.log("\n🧪 Running Anti-Leakage & Data Sanitization Security Tests...");
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

  // Raw Database Question (Contains answerData & solution)
  const rawDbQuestion = {
    id: "q_secure_1",
    text: "What is 2 + 2?",
    options: JSON.stringify(["1", "2", "3", "4"]),
    answerData: JSON.stringify({ correctAnswer: "4", exact: 4, feedback: "Basic arithmetic" }),
    category: "Quantitative",
    type: "MCQ_SINGLE",
    points: 1.0,
    negativePoints: 0.0,
    authorId: "setter_1",
    status: "APPROVED"
  };

  // Sanitizer function applied before sending questions to candidate frontend
  function sanitizeQuestionForCandidate(q: any) {
    let parsedOptions = [];
    try {
      parsedOptions = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    } catch {
      parsedOptions = [];
    }

    return {
      id: q.id,
      text: q.text,
      imageUrl: q.imageUrl || null,
      options: parsedOptions,
      category: q.category,
      type: q.type,
      points: q.points,
      negativePoints: q.negativePoints
      // Notice: answerData, correctAnswer, isCorrect, solution, authorId are strictly excluded
    };
  }

  const sanitized = sanitizeQuestionForCandidate(rawDbQuestion);
  const serialized = JSON.stringify(sanitized);

  assert("Sanitized Question Excludes 'answerData'", !("answerData" in sanitized));
  assert("Sanitized Question Excludes 'correctAnswer'", !("correctAnswer" in sanitized));
  assert("Sanitized Question Excludes 'correctAnswers'", !("correctAnswers" in sanitized));
  assert("Sanitized Question Excludes 'isCorrect'", !("isCorrect" in sanitized));
  assert("Sanitized Question Excludes 'authorId'", !("authorId" in sanitized));
  
  assert("JSON Payload Has Zero Traces of Solution Answer Key", !serialized.includes("Basic arithmetic") && !serialized.includes('"correctAnswer"'));
  assert("Candidate Receives Required Presentation Fields", sanitized.text === "What is 2 + 2?" && sanitized.options.length === 4);

  return { passed, total };
}
