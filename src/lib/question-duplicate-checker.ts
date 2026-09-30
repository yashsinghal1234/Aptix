/**
 * Intelligent Duplicate Question Stem & Similarity Checker.
 * Prevents question bank pollution, duplicate authoring, and redundant CSV bulk uploads.
 */

export function normalizeQuestionStem(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // Strip common question numbering prefixes e.g. "Q1:", "Question 1.", "1)", "1."
    .replace(/^(?:(?:question|ques|problem|item)\s*(?:\d+|[a-z])?|q\.?\s*\d+|q\s*|\(?\d+\s*[\)\.\:\-])\s*[\:\.\-]?\s*/i, "")
    // Remove all punctuation
    .replace(/[^\w\s]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
  "by", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "this", "that", "these", "those"
]);

/**
 * Calculates token-based Jaccard similarity (0 to 1) between two question stems.
 */
export function calculateStemSimilarity(stemA: string, stemB: string): number {
  const normA = normalizeQuestionStem(stemA);
  const normB = normalizeQuestionStem(stemB);

  if (normA === normB && normA.length > 0) return 1.0;
  if (!normA || !normB) return 0;

  let rawTokensA = normA.split(" ").filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  let rawTokensB = normB.split(" ").filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // If aggressive stop-word removal leaves nothing, fallback to words with length > 1
  if (rawTokensA.length === 0) rawTokensA = normA.split(" ").filter((w) => w.length > 1);
  if (rawTokensB.length === 0) rawTokensB = normB.split(" ").filter((w) => w.length > 1);

  const tokensA = new Set(rawTokensA);
  const tokensB = new Set(rawTokensB);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of Array.from(tokensA)) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...Array.from(tokensA), ...Array.from(tokensB)]).size;
  return union === 0 ? 0 : intersection / union;
}

export interface DuplicateCheckMatch {
  isDuplicate: boolean;
  isExact: boolean;
  similarity: number;
  matchedId?: string;
  matchedStem?: string;
}

/**
 * Compares candidate question stem against an existing array of questions.
 * Flags exact matches or high-similarity (> 85%) near duplicates.
 */
export function findDuplicateInQuestionList(
  newStem: string,
  existingList: { id: string; text: string }[]
): DuplicateCheckMatch {
  const normNew = normalizeQuestionStem(newStem);

  for (const existing of existingList) {
    const normExisting = normalizeQuestionStem(existing.text);

    if (normNew === normExisting && normNew.length > 0) {
      return {
        isDuplicate: true,
        isExact: true,
        similarity: 1.0,
        matchedId: existing.id,
        matchedStem: existing.text,
      };
    }

    const similarity = calculateStemSimilarity(newStem, existing.text);
    if (similarity >= 0.85) {
      return {
        isDuplicate: true,
        isExact: false,
        similarity: Math.round(similarity * 100) / 100,
        matchedId: existing.id,
        matchedStem: existing.text,
      };
    }
  }

  return {
    isDuplicate: false,
    isExact: false,
    similarity: 0,
  };
}
