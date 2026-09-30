import {
  normalizeQuestionStem,
  calculateStemSimilarity,
  findDuplicateInQuestionList,
} from "../src/lib/question-duplicate-checker";

export function runQuestionBankIntegrityTests(): { passed: number; total: number } {
  console.log("\n🧪 Running Question Bank & Duplicate Detection Integrity Tests...");
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

  // 1. Normalization strips numbering prefixes & punctuation
  const raw1 = "Question 12: What is the capital of France?";
  const norm1 = normalizeQuestionStem(raw1);
  assert("Normalization strips 'Question 12:' prefix", norm1 === "what is the capital of france");

  const raw2 = "1) What is the capital of France?!";
  const norm2 = normalizeQuestionStem(raw2);
  assert("Normalization strips '1)' numbering and punctuation", norm2 === "what is the capital of france");

  // 2. Similarity calculation
  const simExact = calculateStemSimilarity(
    "What is the capital of France?",
    "What is the capital of France?"
  );
  assert("Exact match yields 1.0 similarity", simExact === 1.0);

  const simHigh = calculateStemSimilarity(
    "What is the capital city of France?",
    "What is the capital of France?"
  );
  assert("Near-identical question yields high similarity (> 0.75)", simHigh >= 0.75);

  const simDifferent = calculateStemSimilarity(
    "What is the capital of France?",
    "Calculate the square root of 144."
  );
  assert("Completely different question yields 0 similarity", simDifferent === 0);

  // 3. Duplicate search against question bank
  const existingQuestions = [
    { id: "q1", text: "What is the capital of France?" },
    { id: "q2", text: "Which data structure works on FIFO basis?" },
  ];

  const matchExact = findDuplicateInQuestionList(
    "1. What is the capital of France?",
    existingQuestions
  );
  assert("Finds exact normalized duplicate", matchExact.isDuplicate && matchExact.isExact);
  assert("Identifies correct matched question ID", matchExact.matchedId === "q1");

  const matchUnique = findDuplicateInQuestionList(
    "Explain the difference between TCP and UDP protocols.",
    existingQuestions
  );
  assert("Unique question correctly identified as not duplicate", !matchUnique.isDuplicate);

  return { passed, total };
}
