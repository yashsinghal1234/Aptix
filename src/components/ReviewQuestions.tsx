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
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">Question Review & Quality Queue</h3>
          <p className="text-xs text-slate-400 mt-0.5">Author submissions pending owner verification</p>
        </div>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
          {questions.length} Pending
        </span>
      </div>
      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {questions.map(q => {
          let parsedOptions = [];
          try {
            parsedOptions = JSON.parse(q.options);
          } catch (e) {}

          return (
            <div key={q.id} className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-[10px] font-extrabold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-brand-100">
                      {q.category}
                    </span>
                    <span className="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {q.difficultyLevel}
                    </span>
                    {q.isExtracted && (
                      <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        🤖 AI Parsed
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{q.text}</h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReview(q.id, "REJECT")}
                    disabled={loadingId === q.id}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50 border border-rose-100"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReview(q.id, "APPROVE")}
                    disabled={loadingId === q.id}
                    className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-brand disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 pl-4 border-l-2 border-brand-200 mt-4">
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
                    <div key={idx} className={`p-3 rounded-xl flex items-start gap-3 text-xs ${isCorrect ? 'bg-emerald-50/70 border border-emerald-200' : 'bg-slate-50 border border-slate-100'}`}>
                      <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 ${isCorrect ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className={`font-semibold ${isCorrect ? 'text-emerald-900' : 'text-slate-700'}`}>
                          {opt.text}
                        </p>
                        {opt.explanation && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
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
