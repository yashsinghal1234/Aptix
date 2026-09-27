import React from "react";
import { prisma } from "@/lib/prisma";
import { DeleteQuestionButton } from "@/components/DeleteQuestionButton";

export const dynamic = "force-dynamic";

export default async function QuestionBankDashboard() {
  const questions = await prisma.question.findMany({
    orderBy: { category: "asc" }
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Question Bank</h2>
          <p className="text-neutral-400 mt-1 text-xs">Review and manage all authored questions.</p>
        </div>
        <a 
          href="/dashboard/setter"
          className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          <span>Add Questions</span>
        </a>
      </div>
      
      <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-md overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-[#07080c]">
          <h3 className="font-bold text-white text-sm">All Questions ({questions.length})</h3>
        </div>
        
        <div className="divide-y divide-neutral-800/80 max-h-[700px] overflow-y-auto">
          {questions.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 text-xs">
              No questions found. Click "Add Questions" to create some.
            </div>
          ) : (
            questions.map((q) => {
              return (
                <div key={q.id} className="p-6 hover:bg-neutral-900/30 transition-colors">
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <div className="flex-1">
                      <span className="inline-block px-2.5 py-0.5 bg-neutral-900 text-neutral-300 border border-neutral-800 text-xs font-semibold rounded-full mb-2">
                        {q.category}
                      </span>
                      <p className="font-bold text-white text-base leading-relaxed">
                        {q.text}
                      </p>
                      {q.imageUrl && (
                        <div className="mt-3">
                          <img src={q.imageUrl} alt="Question figure" className="max-h-48 rounded-xl border border-neutral-800 shadow-sm bg-black p-1 object-contain" />
                        </div>
                      )}
                    </div>
                    <DeleteQuestionButton id={q.id} />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs max-w-3xl">
                    {(() => {
                      let options: any[] = [];
                      try {
                        options = JSON.parse(q.options);
                      } catch(e) {}
                      return options.map((opt: any, idx: number) => {
                        const optText = typeof opt === "string" ? opt : opt.text;
                        let isCorrect = false;
                        try {
                          const parsedAns = JSON.parse(q.answerData);
                          isCorrect = parsedAns.correctAnswer === optText || (parsedAns.correctAnswers && parsedAns.correctAnswers.includes(optText));
                        } catch(e) {}

                        return (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-xl border transition-all ${
                              isCorrect 
                                ? 'bg-emerald-950/20 border-emerald-500/30 font-bold text-emerald-300' 
                                : 'bg-neutral-900/50 border-neutral-800 text-neutral-300'
                            }`}
                          >
                            <span className="text-neutral-500 mr-2 font-mono font-bold">{String.fromCharCode(65 + idx)}.</span>
                            {optText}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
