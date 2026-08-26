"use client";

import { useState } from "react";
import { reviewQuestionAction } from "@/app/actions/schedule";

export function ReviewQuestions({ questions }: { questions: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleReview = async (id: string, action: "APPROVE" | "REJECT") => {
    setLoadingId(id);
    await reviewQuestionAction(id, action);
    setLoadingId(null);
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl border shadow-sm text-center">
        <p className="text-slate-500">No questions currently pending review.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800">Pending Review Queue</h3>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
          {questions.length} Pending
        </span>
      </div>
      <div className="divide-y max-h-[600px] overflow-y-auto">
        {questions.map(q => {
          let parsedOptions = [];
          try {
            parsedOptions = JSON.parse(q.options);
          } catch (e) {}

          return (
            <div key={q.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wide">
                      {q.category}
                    </span>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase tracking-wide">
                      {q.difficultyLevel}
                    </span>
                    {q.isExtracted && (
                      <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                        🤖 AI Extracted
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-slate-900 text-lg">{q.text}</h4>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(q.id, "REJECT")}
                    disabled={loadingId === q.id}
                    className="px-4 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReview(q.id, "APPROVE")}
                    disabled={loadingId === q.id}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                {parsedOptions.map((opt: any, idx: number) => {
                  let correctAnsText = "";
                  try {
                    const parsedAns = JSON.parse(q.answerData);
                    correctAnsText = parsedAns.correctAnswer || (q as any).correctAnswer;
                  } catch (e) {
                    correctAnsText = (q as any).correctAnswer;
                  }

                  const isCorrect = correctAnsText === opt.text;
                  return (
                    <div key={idx} className={`p-3 rounded-lg flex items-start gap-3 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-100'}`}>
                      <div className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 ${isCorrect ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className={`font-medium text-sm ${isCorrect ? 'text-green-900' : 'text-slate-700'}`}>
                          {opt.text}
                        </p>
                        {opt.explanation && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            Explanation: {opt.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
