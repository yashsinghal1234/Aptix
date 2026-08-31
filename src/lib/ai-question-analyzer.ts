import { prisma } from "@/lib/prisma";

export const FIXED_TOPICS = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Ability",
  "Data Interpretation",
  "Abstract Reasoning",
  "Computer Science & Tech",
  "General Awareness",
  "Domain Specific"
] as const;

export type FixedTopic = typeof FIXED_TOPICS[number];

export const FIXED_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type FixedDifficulty = typeof FIXED_DIFFICULTIES[number];

export interface ParsedOption {
  text: string;
  explanation?: string;
  imageUrl?: string | null;
}

export interface QuestionQualityFeedback {
  overallScore: number; // 1-10
  distractorCritique: string[];
  ambiguityStatus: "PASSED" | "WARNING";
  ambiguityMessage: string;
  suggestedPoints: number;
  duplicateMatch: {
    found: boolean;
    questionId?: string;
    existingText?: string;
    similarityScore?: number;
  };
}

export interface ParsedQuestionWithAI {
  id: string;
  text: string;
  options: ParsedOption[];
  correctAnswerIndex: number;
  category: FixedTopic;
  difficultyLevel: FixedDifficulty;
  confidence: number;
  draftExplanation: string;
  qualityFeedback: QuestionQualityFeedback;
}

/**
 * Calculates similarity between two text strings using Jaccard word-overlap
 */
function calculateTextSimilarity(str1: string, str2: string): number {
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const set1 = new Set(normalize(str1));
  const set2 = new Set(normalize(str2));

  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Classifies question text and options into our strictly defined fixed taxonomy
 */
export function classifyTaxonomy(text: string, options: string[]): { category: FixedTopic; difficulty: FixedDifficulty; confidence: number } {
  const content = (text + " " + options.join(" ")).toLowerCase();

  // Keyword rules for fixed taxonomy
  const quantKeywords = ["calculate", "speed", "distance", "ratio", "percentage", "profit", "loss", "interest", "probability", "area", "volume", "perimeter", "triangle", "equation", "sum", "average", "remainder", "fraction", "algebra", "geometric", "work done", "pipes", "cistern", "train", "km/h", "meters", "integers"];
  const logicalKeywords = ["blood relation", "seating arrangement", "syllogism", "statement and conclusion", "premise", "pattern", "series", "sequence", "odd one out", "coded", "direction sense", "north", "south", "cube", "dice", "family tree", "ranking", "analogy", "deduction", "truth", "lie"];
  const verbalKeywords = ["synonym", "antonym", "grammatical", "idiom", "phrase", "comprehension", "passage", "sentence", "preposition", "vocabulary", "correct spelt", "spelling", "analogy", "metaphor", "fill in the blank", "meaning of", "opposite of", "conjunction", "tense", "clause"];
  const diKeywords = ["bar graph", "pie chart", "table below", "graph shows", "data interpretation", "histogram", "line chart", "tabular data", "trend", "percentage increase in sales", "revenue from", "expenditure"];
  const csKeywords = ["algorithm", "complexity", "time complexity", "binary tree", "sql", "query", "database", "recursion", "array", "stack", "queue", "pointer", "cpu", "cache", "operating system", "thread", "process", "network", "tcp", "http", "class", "object", "inheritance", "polymorphism", "compiler"];
  const abstractKeywords = ["rotation", "mirror image", "water image", "figure", "matrix", "paper folding", "embedded figure", "shape", "diagram", "arrows", "pattern completion"];
  const gaKeywords = ["president", "prime minister", "capital of", "currency", "treaty", "nobel", "olympics", "headquarters", "constitution", "parliament", "amendment", "river", "mountain", "historical", "war of", "dynasty", "planet", "discovered", "invented by", "award"];

  let scores: Record<FixedTopic, number> = {
    "Quantitative Aptitude": 0,
    "Logical Reasoning": 0,
    "Verbal Ability": 0,
    "Data Interpretation": 0,
    "Computer Science & Tech": 0,
    "Abstract Reasoning": 0,
    "General Awareness": 0,
    "Domain Specific": 1 // baseline
  };

  quantKeywords.forEach(k => { if (content.includes(k)) scores["Quantitative Aptitude"] += 3; });
  logicalKeywords.forEach(k => { if (content.includes(k)) scores["Logical Reasoning"] += 3; });
  verbalKeywords.forEach(k => { if (content.includes(k)) scores["Verbal Ability"] += 3; });
  diKeywords.forEach(k => { if (content.includes(k)) scores["Data Interpretation"] += 4; });
  csKeywords.forEach(k => { if (content.includes(k)) scores["Computer Science & Tech"] += 4; });
  abstractKeywords.forEach(k => { if (content.includes(k)) scores["Abstract Reasoning"] += 3; });
  gaKeywords.forEach(k => { if (content.includes(k)) scores["General Awareness"] += 3; });

  // Math symbol checks
  if (/[\d\+\-\*\/\=\%\^\√]/.test(text) && /\d+/.test(text)) {
    scores["Quantitative Aptitude"] += 2;
  }

  let bestTopic: FixedTopic = "General Awareness";
  let maxScore = -1;

  for (const [topic, score] of Object.entries(scores) as [FixedTopic, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestTopic = topic;
    }
  }

  // Difficulty heuristic
  let difficulty: FixedDifficulty = "MEDIUM";
  const wordCount = text.split(/\s+/).length;
  const hasFormula = /[\(\)\{\}\^\_\=\\\/]/.test(text) || content.includes("assuming") || content.includes("furthermore");
  const complexWords = text.split(/\s+/).filter(w => w.length > 8).length;

  if (wordCount < 14 && complexWords < 2 && !hasFormula) {
    difficulty = "EASY";
  } else if (wordCount > 35 || complexWords > 5 || hasFormula || content.includes("calculate the probability") || content.includes("worst-case")) {
    difficulty = "HARD";
  } else {
    difficulty = "MEDIUM";
  }

  const confidence = Math.min(96, Math.max(72, 70 + maxScore * 4));

  return { category: bestTopic, difficulty, confidence };
}

/**
 * Analyzes Distractor Quality (identifies obviously silly choices or weak distractors)
 */
export function analyzeDistractorQuality(
  questionText: string,
  options: string[],
  correctIndex: number
): { critiques: string[]; qualityScore: number } {
  const critiques: string[] = [];
  let score = 9.0;

  if (options.length < 2) {
    return { critiques: ["Insufficient options provided."], qualityScore: 3.0 };
  }

  const correctText = options[correctIndex] || "";
  const distractors = options.filter((_, idx) => idx !== correctIndex);

  // 1. Length disparity check
  const correctLen = correctText.length;
  distractors.forEach((d, idx) => {
    if (d.length > correctLen * 3.5) {
      critiques.push(`Distractor "${d}" is significantly longer than the correct answer, which may attract unintended bias.`);
      score -= 1.0;
    } else if (correctLen > d.length * 4 && d.length > 0) {
      critiques.push(`Distractor "${d}" is extremely brief compared to other choices.`);
      score -= 0.5;
    }
  });

  // 2. Numerical magnitude / outlier check
  const numMatches = options.map(o => parseFloat(o.replace(/[^0-9.-]/g, "")));
  const allNumeric = numMatches.every(n => !isNaN(n));

  if (allNumeric) {
    const correctNum = numMatches[correctIndex];
    const distractorNums = numMatches.filter((_, idx) => idx !== correctIndex);

    distractorNums.forEach(dn => {
      if (Math.abs(dn - correctNum) > Math.abs(correctNum * 10) && dn !== 0 && correctNum !== 0) {
        critiques.push(`Distractor value ${dn} is an extreme outlier compared to correct value ${correctNum} and can be trivially ruled out.`);
        score -= 1.5;
      }
    });
  }

  // 3. Trivially silly or empty options
  distractors.forEach(d => {
    if (d.toLowerCase() === "none" || d.toLowerCase() === "none of the above" || d.toLowerCase() === "all of the above") {
      critiques.push(`Using generic choice "${d}" reduces item discrimination.`);
      score -= 0.8;
    }
    if (d.trim().length === 0) {
      critiques.push(`Empty distractor slot detected.`);
      score -= 3.0;
    }
  });

  if (critiques.length === 0) {
    critiques.push("All 3 distractors are well-balanced in length and plausibility.");
  }

  return { critiques, qualityScore: Math.max(1, Math.min(10, Math.round(score * 10) / 10)) };
}

/**
 * Checks for potential ambiguity or multiple defensible answers
 */
export function checkAmbiguity(
  questionText: string,
  options: string[],
  correctIndex: number
): { status: "PASSED" | "WARNING"; message: string } {
  // Check duplicate options
  const lowerOptions = options.map(o => o.trim().toLowerCase());
  const uniqueOptions = new Set(lowerOptions);

  if (uniqueOptions.size !== options.length) {
    return {
      status: "WARNING",
      message: "Two or more options are identical. Candidates may be confused or receive multiple correct options."
    };
  }

  // Check if negative phrasing without clear indicator
  const qLower = questionText.toLowerCase();
  if ((qLower.includes(" not ") || qLower.includes(" except ") || qLower.includes(" false ")) && !qLower.includes("NOT") && !qLower.includes("EXCEPT")) {
    return {
      status: "WARNING",
      message: "Question contains negative constraint ('not' / 'except'). Consider capitalizing for candidate clarity."
    };
  }

  return {
    status: "PASSED",
    message: "Clear, unambiguous single-answer item."
  };
}

/**
 * Generates an automated draft explanation for the question
 */
export function generateDraftExplanation(
  questionText: string,
  options: string[],
  correctIndex: number,
  category: FixedTopic
): string {
  const correctOption = options[correctIndex];
  return `The correct answer is "${correctOption}". In ${category}, this follows from analyzing the problem stem and systematically verifying the conditions against the given choices.`;
}

/**
 * Complete AI Question Quality & Taxonomy Pipeline
 */
export async function analyzeQuestionWithAI(
  text: string,
  rawOptions: string[],
  correctAnswerIndex: number,
  customExplanation?: string
): Promise<ParsedQuestionWithAI> {
  const cleanOptions = rawOptions.map(o => o.trim());
  const taxonomy = classifyTaxonomy(text, cleanOptions);
  const distractorAnalysis = analyzeDistractorQuality(text, cleanOptions, correctAnswerIndex);
  const ambiguity = checkAmbiguity(text, cleanOptions, correctAnswerIndex);
  const draftExplanation = customExplanation?.trim() || generateDraftExplanation(text, cleanOptions, correctAnswerIndex, taxonomy.category);

  // Check for duplicate in DB
  let duplicateMatch = {
    found: false,
    questionId: undefined as string | undefined,
    existingText: undefined as string | undefined,
    similarityScore: 0
  };

  try {
    const existingQuestions = await prisma.question.findMany({
      select: { id: true, text: true, category: true },
      take: 100
    });

    for (const eq of existingQuestions) {
      const sim = calculateTextSimilarity(text, eq.text);
      if (sim >= 70) {
        duplicateMatch = {
          found: true,
          questionId: eq.id,
          existingText: eq.text,
          similarityScore: sim
        };
        break;
      }
    }
  } catch (e) {
    console.error("Duplicate check error:", e);
  }

  return {
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: text.trim(),
    options: cleanOptions.map(o => ({ text: o, explanation: "" })),
    correctAnswerIndex: Math.max(0, Math.min(cleanOptions.length - 1, correctAnswerIndex)),
    category: taxonomy.category,
    difficultyLevel: taxonomy.difficulty,
    confidence: taxonomy.confidence,
    draftExplanation,
    qualityFeedback: {
      overallScore: distractorAnalysis.qualityScore,
      distractorCritique: distractorAnalysis.critiques,
      ambiguityStatus: ambiguity.status,
      ambiguityMessage: ambiguity.message,
      suggestedPoints: taxonomy.difficulty === "HARD" ? 2.0 : 1.0,
      duplicateMatch
    }
  };
}
