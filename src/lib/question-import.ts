/**
 * Shared question-import helpers — pure functions usable from both client
 * components and server actions, so the Quick-Grid editor, the CSV importer,
 * and the server validate keys with the exact same rules.
 */

export type ImportQType = "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE" | "FILL_BLANK" | "NUMERIC";

export const IMPORT_TYPE_LABELS: Record<ImportQType, string> = {
  MCQ_SINGLE: "MCQ Single",
  MCQ_MULTI: "MCQ Multi",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill blank",
  NUMERIC: "Numeric",
};

/** Accepts loose user input (case, punctuation) and maps it to a canonical qType. */
export function canonicalQType(raw: string | undefined | null): ImportQType {
  const v = (raw || "").toLowerCase().replace(/[^a-z]/g, "");
  if (v.includes("multi")) return "MCQ_MULTI";
  if (v.includes("true") || v === "tf") return "TRUE_FALSE";
  if (v.includes("fill") || v.includes("blank")) return "FILL_BLANK";
  if (v.includes("numeric") || v.includes("number")) return "NUMERIC";
  return "MCQ_SINGLE";
}

/** "A".."D", "a-d", 0-3 → option index; null when unparseable. */
export function toCorrectIndex(raw: string): number | null {
  const v = (raw || "").trim().toLowerCase();
  if (/^[0-3]$/.test(v)) return parseInt(v, 10);
  if (v === "a" || v === "1") return 0;
  if (v === "b" || v === "2") return 1;
  if (v === "c" || v === "3") return 2;
  if (v === "d" || v === "4") return 3;
  return null;
}

/**
 * Parses a grid row's Key cell into the server-side answerData string.
 * Returns { error } with a user-facing message when the key is unusable.
 *
 * Key grammar per type:
 * - MCQ_SINGLE / TRUE_FALSE: single choice (A-D, 0-3, True/False, T/F, Yes/No)
 * - MCQ_MULTI: comma-separated ticked options ("A,C" or "0,2")
 * - NUMERIC: the exact number (optionally "42 ±0.5" for tolerance)
 * - FILL_BLANK: pipes/comma-separated accepted answers ("yes | yeah")
 */
export function buildAnswerData(
  qType: ImportQType,
  key: string,
  options: string[]
): { answerData: string } | { error: string } {
  const v = (key || "").trim();
  switch (qType) {
    case "MCQ_SINGLE": {
      const idx = toCorrectIndex(v);
      if (idx === null) return { error: "Answer key must be 0–3 or A–D" };
      const text = options[idx];
      if (!text || !text.trim()) return { error: `The keyed option ${String.fromCharCode(65 + idx)} is empty` };
      return { answerData: JSON.stringify({ correctAnswer: text.trim() }) };
    }
    case "TRUE_FALSE": {
      const lowered = v.toLowerCase();
      let idx: number | null = null;
      if (/^[01]$/.test(v)) idx = parseInt(v, 10);
      else if (lowered.startsWith("t") || lowered.startsWith("y")) idx = 0;
      else if (lowered.startsWith("f") || lowered.startsWith("n")) idx = 1;
      if (idx === null) return { error: "Answer key must be True/False (T/F also works)" };
      const pair = ["True", "False"];
      return { answerData: JSON.stringify({ correctAnswer: pair[idx] }) };
    }
    case "MCQ_MULTI": {
      const idxs = v
        .split(/[,;|]+/)
        .map((c) => toCorrectIndex(c))
        .filter((x): x is number => x !== null);
      if (idxs.length === 0) return { error: "Answer key must list ticked options, e.g. A,C or 0,2" };
      const correctAnswers = idxs.map((i) => options[i]).filter((o): o is string => !!o && !!o.trim());
      if (correctAnswers.length !== idxs.length) {
        return { error: "Every ticked option must exist (A–D all filled for multi-correct rows)" };
      }
      return { answerData: JSON.stringify({ correctAnswers }) };
    }
    case "NUMERIC": {
      const m = v.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:[±+-]|(\btol\b))?\s*(\d*\.?\d+)?$/i);
      if (!m) return { error: "Answer key must be a number, optionally with tolerance (e.g. 4.5 or 42 ±0.5)" };
      const exact = parseFloat(m[1]);
      const tolerance = m[3] !== undefined ? parseFloat(m[3]) : 0;
      if (!Number.isFinite(exact)) return { error: "Answer key must be a valid number" };
      return { answerData: JSON.stringify({ exact, tolerance: Number.isFinite(tolerance) ? tolerance : 0 }) };
    }
    case "FILL_BLANK": {
      const accepted = v
        .split(/[|;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (accepted.length === 0) return { error: "Answer key must carry accepted answers (e.g. yes | Yeah)" };
      return {
        answerData: JSON.stringify({
          blanks: { "1": { accepted, points: 1, caseSensitive: false } },
          partialCredit: true,
        }),
      };
    }
  }
}

/** TRUE/False option pair used when persisting TF questions. */
export const TF_OPTIONS = ["True", "False"];
