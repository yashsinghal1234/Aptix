export interface RawParsedItem {
  stem: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

/**
 * Robust line-by-line question parser supporting multi-line stems, isolated "Question 1:" headers,
 * various option prefixes (A), A., [A], Option A), inline options, and custom explanations.
 */
export function parseTextBlobToRawItems(textBlob: string): RawParsedItem[] {
  const normalized = textBlob.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n").map(l => l.trim());

  const items: RawParsedItem[] = [];

  let curStemLines: string[] = [];
  let curOptions: string[] = [];
  let curAnswerIndex = 0;
  let curExplanationLines: string[] = [];
  let state: "IDLE" | "IN_STEM" | "IN_OPTIONS" | "IN_EXPLANATION" = "IDLE";

  const flushCurrentItem = () => {
    const stem = curStemLines.join("\n").trim();
    if (stem && curOptions.length >= 2) {
      const opts = [...curOptions];
      while (opts.length < 4) {
        opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
      }
      const explanation = curExplanationLines.join("\n").trim();
      items.push({
        stem,
        options: opts.slice(0, 4),
        answerIndex: Math.max(0, Math.min(opts.length - 1, curAnswerIndex)),
        explanation: explanation.length > 0 ? explanation : undefined
      });
    }
    curStemLines = [];
    curOptions = [];
    curAnswerIndex = 0;
    curExplanationLines = [];
    state = "IDLE";
  };

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

    // 1. Check Answer Line
    const ansMatch = line.match(answerPrefixRegex);
    if (ansMatch && (curOptions.length > 0 || state === "IN_OPTIONS")) {
      const rawAnsVal = ansMatch[1].trim();
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

    // 3. Check Option Line(s)
    const multipleInlineMatches = line.split(/(?=\s+(?:\(?[A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][\.\:\-])\s+)/);
    if (multipleInlineMatches.length >= 2 && singleOptionPrefixRegex.test(multipleInlineMatches[0].trim())) {
      state = "IN_OPTIONS";
      for (const optChunk of multipleInlineMatches) {
        const m = optChunk.trim().match(singleOptionPrefixRegex);
        if (m) {
          const optText = (m[5] || "").trim();
          curOptions.push(optText);
        }
      }
      continue;
    }

    const singleOptMatch = line.match(singleOptionPrefixRegex);
    if (singleOptMatch && (state === "IN_STEM" || curStemLines.length > 0 || state === "IN_OPTIONS")) {
      state = "IN_OPTIONS";
      const optText = (singleOptMatch[5] || "").trim();
      curOptions.push(optText);
      continue;
    }

    // 4. Check Question Header / Start
    const qHeaderMatch = line.match(questionHeaderPrefixRegex);
    if (qHeaderMatch) {
      if (curStemLines.length > 0 && curOptions.length >= 2) {
        flushCurrentItem();
      }

      state = "IN_STEM";
      const remainingStemText = qHeaderMatch[1].trim();
      if (remainingStemText) {
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
