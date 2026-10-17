export interface RawParsedItem {
  stem: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
  category?: string;
  /** Detected question type: MCQ (default), True/False, fill-in-blank, or numeric. */
  qType?: "MCQ_SINGLE" | "TRUE_FALSE" | "FILL_BLANK" | "NUMERIC";
  /** Raw answer text captured from "Ans:" lines — drives FILL_BLANK and NUMERIC saves. */
  answerText?: string;
  tolerance?: number;
}

/**
 * Robust line-by-line question parser supporting multi-line stems, isolated "Question 1:" headers,
 * various option prefixes (A), A., [A], Option A), inline options, custom explanations, and category/subject tags.
 *
 * Academic conventions accepted:
 * - Moodle-style correct marker: a leading * on the correct option line ("* c) Answer text")
 * - "Ans:" values as letters (A-D / 1-4), words matching an option ("Ans: True"), numbers
 *   (numeric questions), or literal accepted answers for fill-in-blank stems.
 * - Type auto-detection: True/False pairs, "___" blank stems with literal answers, numeric answers.
 * - No junk padding: options are saved at their real count (min 2 for choice questions).
 */
export function parseTextBlobToRawItems(textBlob: string): RawParsedItem[] {
  const normalized = textBlob.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n").map(l => l.trim());

  const items: RawParsedItem[] = [];

  let curStemLines: string[] = [];
  let curOptions: string[] = [];
  let curAnswerIndex = 0;
  let curAnsExplicit = false; // an Ans: line or * marker was seen (vs silent default)
  let curAnsText: string | undefined;
  let curExplanationLines: string[] = [];
  let curCategory: string | undefined = undefined;
  let currentGlobalCategory: string | undefined = undefined;
  let state: "IDLE" | "IN_STEM" | "IN_OPTIONS" | "IN_EXPLANATION" = "IDLE";

  const flushCurrentItem = () => {
    const stem = curStemLines.join("\n").trim();
    if (stem) {
      const opts = curOptions.slice(0, 4);
      const explanation = curExplanationLines.join("\n").trim();

      // True/False detection: exactly two options that are True/False
      const isTF = opts.length === 2 && opts.every(o => /^(true|false)[\.\?!]?\s*$/i.test(o));

      const hasBlank = /_{3,}/.test(stem);
      const numericAnswer = curAnsText && /^[-+]?\d+(\.\d+)?$/.test(curAnsText.trim()) ? curAnsText.trim() : undefined;

      if (hasBlank && curAnsText && opts.length < 2) {
        // "fill in the blank with [ 1 ]" — the Ans: value is the accepted text
        items.push({
          stem,
          options: [],
          answerIndex: 0,
          explanation: explanation.length > 0 ? explanation : undefined,
          category: curCategory || currentGlobalCategory || undefined,
          qType: "FILL_BLANK",
          answerText: curAnsText,
        });
      } else if (!isTF && opts.length === 0 && numericAnswer) {
        items.push({
          stem,
          options: [],
          answerIndex: 0,
          explanation: explanation.length > 0 ? explanation : undefined,
          category: curCategory || currentGlobalCategory || undefined,
          qType: "NUMERIC",
          answerText: numericAnswer,
          tolerance: 0,
        });
      } else if (opts.length >= 2) {
        const idx = Math.max(0, Math.min(opts.length - 1, isTF ? Math.min(curAnswerIndex, 1) : curAnswerIndex));
        items.push({
          stem,
          options: opts,
          answerIndex: idx,
          explanation: explanation.length > 0 ? explanation : undefined,
          category: curCategory || currentGlobalCategory || undefined,
          qType: isTF ? "TRUE_FALSE" : "MCQ_SINGLE",
          answerText: isTF ? (opts[idx] || undefined) : curAnsText,
        });
      }
    }
    curStemLines = [];
    curOptions = [];
    curAnswerIndex = 0;
    curAnsExplicit = false;
    curAnsText = undefined;
    curExplanationLines = [];
    curCategory = undefined;
    state = "IDLE";
  };

  const categoryPrefixRegex = /^(?:\[\s*)?(?:category|subject|topic|section)\s*[\:\=\-]\s*(.+?)(?:\s*\])?$/i;
  const commaMetaRegex = /^([A-Za-z\s&]{2,40}),\s*(Easy|Medium|Hard)(?:,\s*\d+(?:\.\d+)?\s*points?)?$/i;
  const questionHeaderPrefixRegex = /^(?:(?:question|ques|problem|item)\s*(?:\d+|[a-z])?|q\.?\s*\d+|q\s*|\(?\d+\s*[\)\.\:\-])\s*[\:\.\-]?\s*(.*)$/i;
  const singleOptionPrefixRegex = /^(?:(?:\(?([A-Ea-e])\)|\[([A-Ea-e])\]|([A-Ea-e])[\.\:\-])|(?:option\s*([A-Ea-e1-5])[\.\:\-]?))\s*(.*)$/i;
  const answerPrefixRegex = /^(?:(?:correct\s*(?:answer|option)?|answer|ans|key)\s*(?:is|\:|\=|\-)?)\s*(.*)$/i;
  const explanationPrefixRegex = /^(?:(?:explanation|explain|solution|rationale|reason)\s*[\:\=\-]?\s*)(.*)$/i;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) {
      // Empty line
      continue;
    }

    // 0. Check Category / Subject Line
    const catMatch = line.match(categoryPrefixRegex);
    if (catMatch) {
      const catVal = catMatch[1].trim();
      if (catVal.length > 0 && catVal.length < 80) {
        if (curStemLines.length > 0) {
          flushCurrentItem();
        }
        if (state === "IDLE" || (state === "IN_STEM" && curStemLines.length === 0)) {
          currentGlobalCategory = catVal;
          curCategory = catVal;
        } else {
          curCategory = catVal;
        }
        continue;
      }
    }

    // Check comma metadata (e.g. "Arithmetic, Easy, 2 points")
    const commaMatch = line.match(commaMetaRegex);
    if (commaMatch && (state === "IN_EXPLANATION" || state === "IN_OPTIONS")) {
      curCategory = commaMatch[1].trim();
      continue;
    }

    // 1. Check Answer Line
    const ansMatch = line.match(answerPrefixRegex);
    if (ansMatch && (curOptions.length > 0 || state === "IN_OPTIONS" || curStemLines.length > 0)) {
      const rawAnsVal = ansMatch[1].trim();
      curAnsText = rawAnsVal;
      curAnsExplicit = true;
      const letterMatch = rawAnsVal.match(/^[\(\[]?([A-Da-d1-4])[\)\]\.\:]?/);
      if (letterMatch) {
        const ch = letterMatch[1].toUpperCase();
        if (ch >= "A" && ch <= "D") {
          curAnswerIndex = ch.charCodeAt(0) - 65;
        } else if (ch >= "1" && ch <= "4") {
          curAnswerIndex = parseInt(ch, 10) - 1;
        }
      } else if (rawAnsVal && curOptions.length > 0) {
        const matchedIdx = curOptions.findIndex(o =>
          o.toLowerCase().trim() === rawAnsVal.toLowerCase().trim() ||
          rawAnsVal.toLowerCase().includes(o.toLowerCase().trim())
        );
        if (matchedIdx !== -1) curAnswerIndex = matchedIdx;
      }
      state = "IN_EXPLANATION";
      continue;
    }

    // 2. Check Explanation Line
    const expMatch = line.match(explanationPrefixRegex);
    if (expMatch && (state === "IN_OPTIONS" || state === "IN_EXPLANATION")) {
      state = "IN_EXPLANATION";
      if (expMatch[1].trim()) {
        curExplanationLines.push(expMatch[1].trim());
      }
      continue;
    }

    // 2.5. Bare True/False option lines — Moodle TF banks write them unprefixed
    if (/^(true|false)[\.\?!]*$/i.test(line) && (state === "IN_STEM" || state === "IN_OPTIONS") && curStemLines.length > 0) {
      state = "IN_OPTIONS";
      curOptions.push(/^t/i.test(line) ? "True" : "False");
      continue;
    }

    // 3. Check Option Line(s)
    // A leading * marks the correct option (Moodle Word-bank convention):
    // "* c) Photosynthesis is..." → the option flagged correct without an Ans line.
    const asteriskBefore = (l: string) => l.replace(/^\*+\s*/, "");

    const multipleInlineMatches = asteriskBefore(line).split(/(?=\s+(?:\(?[A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][\.\:\-])\s+)/);
    const firstIsOption = singleOptionPrefixRegex.test(multipleInlineMatches[0].trim());
    const restAreOptions = multipleInlineMatches.slice(1).every((c) => !!c.trim() && singleOptionPrefixRegex.test(c.trim()));
    if (multipleInlineMatches.length >= 2 && restAreOptions && !questionHeaderPrefixRegex.test(line)) {
      const hadAsterisk = /^\*+\s*/.test(line);
      state = "IN_OPTIONS";
      if (!firstIsOption) {
        // Options were attached to the stem itself: "Which is a mammal? [A] Bat [B] Shark"
        const stemChunk = multipleInlineMatches[0].trim();
        if (stemChunk) curStemLines.push(stemChunk);
      }
      for (const optChunk of firstIsOption ? multipleInlineMatches : multipleInlineMatches.slice(1)) {
        const m = optChunk.trim().match(singleOptionPrefixRegex);
        if (m) {
          curOptions.push((m[5] || "").trim());
        }
      }
      if (hadAsterisk && curOptions.length > 0) {
        curAnswerIndex = curOptions.length - 1;
        curAnsExplicit = true;
        curAnsText = curOptions[curOptions.length - 1];
      }
      continue;
    }

    const hadLeadingAsterisk = /^\*+\s*/.test(line);
    const lineWithoutStar = asteriskBefore(line);
    const singleOptMatch = lineWithoutStar.match(singleOptionPrefixRegex);
    if (singleOptMatch && (state === "IN_STEM" || curStemLines.length > 0 || state === "IN_OPTIONS")) {
      state = "IN_OPTIONS";
      const optText = (singleOptMatch[5] || "").trim();
      curOptions.push(optText);
      if (hadLeadingAsterisk) {
        curAnswerIndex = curOptions.length - 1;
        curAnsExplicit = true;
        curAnsText = optText;
      }
      continue;
    }

    // 4. Check Question Header / Start
    const qHeaderMatch = line.match(questionHeaderPrefixRegex);
    if (qHeaderMatch) {
      if (curStemLines.length > 0) {
        flushCurrentItem();
      }

      state = "IN_STEM";
      const remainingStemText = qHeaderMatch[1].trim();
      if (remainingStemText) {
        // A header line can carry its options inline: "Q1. Which is even? A) 2 B) 3"
        const inlineChunks = remainingStemText.split(/(?=\s+(?:\(?[A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][\.\:\-])\s+)/);
        const restOpt =
          inlineChunks.length >= 2 &&
          !singleOptionPrefixRegex.test(inlineChunks[0].trim()) &&
          inlineChunks.slice(1).every((c) => !!c.trim() && singleOptionPrefixRegex.test(c.trim()));
        if (restOpt) {
          const stemChunk = inlineChunks[0].trim();
          if (stemChunk) curStemLines.push(stemChunk);
          state = "IN_OPTIONS";
          for (const chunk of inlineChunks.slice(1)) {
            const m = chunk.trim().match(singleOptionPrefixRegex);
            if (m) curOptions.push((m[5] || "").trim());
          }
          continue;
        }
        curStemLines.push(remainingStemText);
      }
      continue;
    }

    // 5. Line Continuation
    if (state === "IN_STEM") {
      curStemLines.push(line);
    } else if (state === "IN_EXPLANATION") {
      curExplanationLines.push(line);
    } else if (state === "IN_OPTIONS") {
      if (curOptions.length > 0) {
        curOptions[curOptions.length - 1] += " " + line;
      }
    } else {
      state = "IN_STEM";
      curStemLines.push(line);
    }
  }

  flushCurrentItem();
  return items;
}
