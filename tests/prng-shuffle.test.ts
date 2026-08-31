export function runPRNGShuffleTests() {
  console.log("\n🧪 Running Deterministic PRNG Shuffle Tests...");
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

  // PRNG implementation (Lehmer LCG)
  function createPRNG(seed: number) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function shuffleArray<T>(array: T[], rng: () => number): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const sampleQuestions = [
    { id: "q1", text: "Question 1" },
    { id: "q2", text: "Question 2" },
    { id: "q3", text: "Question 3" },
    { id: "q4", text: "Question 4" },
    { id: "q5", text: "Question 5" }
  ];

  const seed = 428912;

  // Run 1
  const rng1 = createPRNG(seed);
  const shuffled1 = shuffleArray(sampleQuestions, rng1);

  // Run 2 (Simulating page refresh / crash recovery on another device with same seed)
  const rng2 = createPRNG(seed);
  const shuffled2 = shuffleArray(sampleQuestions, rng2);

  // Run 3 with different seed
  const rng3 = createPRNG(999999);
  const shuffled3 = shuffleArray(sampleQuestions, rng3);

  const order1 = shuffled1.map(q => q.id).join(",");
  const order2 = shuffled2.map(q => q.id).join(",");
  const order3 = shuffled3.map(q => q.id).join(",");

  assert("Same Seed Produces 100% Identical Question Order (Crash Recovery Guarantee)", order1 === order2, `Run1: ${order1} vs Run2: ${order2}`);
  assert("Different Seeds Produce Different Orders", order1 !== order3, `Run1: ${order1} vs Run3: ${order3}`);
  assert("Shuffle Preserves All Original Elements", shuffled1.length === sampleQuestions.length && sampleQuestions.every(q => shuffled1.some(s => s.id === q.id)));

  return { passed, total };
}
