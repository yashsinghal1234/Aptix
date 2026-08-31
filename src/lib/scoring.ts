export interface QuestionForGrading {
  type?: string;
  points: number;
  negativePoints: number;
  answerData?: string | null;
  correctAnswer?: any;
}

export function gradeResponse(q: QuestionForGrading, selectedOption: string): { isCorrect: boolean; earnedPoints: number } {
  let isCorrect = false;
  let earnedPoints = 0;

  if (!selectedOption || selectedOption === "") {
    return { isCorrect: false, earnedPoints: 0 };
  }

  try {
    const parsedAnswer = q.answerData ? JSON.parse(q.answerData) : {};
    const qType = q.type || "MCQ_SINGLE";

    if (qType === "MCQ_SINGLE" || qType === "TRUE_FALSE") {
      const correctTarget = parsedAnswer.correctAnswer !== undefined ? parsedAnswer.correctAnswer : q.correctAnswer;
      isCorrect = selectedOption === correctTarget;
      if (isCorrect) earnedPoints = q.points;
      else earnedPoints = -q.negativePoints;
    } 
    else if (qType === "MCQ_MULTI") {
      const candArray = Array.isArray(selectedOption) ? selectedOption : JSON.parse(selectedOption);
      const correctArray = parsedAnswer.correctAnswers || [];
      if (Array.isArray(candArray) && candArray.length === correctArray.length) {
        isCorrect = correctArray.every((ans: string) => candArray.includes(ans));
      }
      if (isCorrect) earnedPoints = q.points;
      else earnedPoints = -q.negativePoints;
    }
    else if (qType === "NUMERIC") {
      const candVal = parseFloat(selectedOption);
      const targetExact = parsedAnswer.exact !== undefined ? parsedAnswer.exact : parseFloat(q.correctAnswer);
      const tolerance = parsedAnswer.tolerance !== undefined ? parsedAnswer.tolerance : 0;

      if (!isNaN(candVal) && Math.abs(candVal - targetExact) <= tolerance) {
        isCorrect = true;
        earnedPoints = q.points;
      } else {
        earnedPoints = -q.negativePoints;
      }
    }
    else if (qType === "FILL_BLANK") {
      const candBlanks = typeof selectedOption === "object" ? selectedOption : JSON.parse(selectedOption);
      let totalEarned = 0;
      let allCorrect = true;

      for (const [blankId, config] of Object.entries(parsedAnswer.blanks || {})) {
        const conf = config as any;
        const candVal = (candBlanks[blankId] || "").trim();
        const candCheck = conf.caseSensitive ? candVal : candVal.toLowerCase();
        const accepted = (conf.accepted || []).map((v: string) => conf.caseSensitive ? v.trim() : v.trim().toLowerCase());
        
        if (accepted.includes(candCheck)) {
          totalEarned += (conf.points || 1);
        } else {
          allCorrect = false;
        }
      }

      if (parsedAnswer.partialCredit) {
        isCorrect = totalEarned > 0;
        earnedPoints = totalEarned;
      } else {
        isCorrect = allCorrect;
        earnedPoints = allCorrect ? q.points : -q.negativePoints;
      }
    }
  } catch (e) {
    isCorrect = selectedOption === q.correctAnswer;
    if (isCorrect) earnedPoints = q.points;
    else earnedPoints = -q.negativePoints;
  }

  return { isCorrect, earnedPoints };
}
