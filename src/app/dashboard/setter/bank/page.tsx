import React from "react";
import { prisma } from "@/lib/prisma";
import { DeleteQuestionButton } from "@/components/DeleteQuestionButton";

export const dynamic = "force-dynamic";

export default async function QuestionBankDashboard() {
  const questions = await prisma.question.findMany({
    orderBy: { category: "asc" }
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Question Bank</h2>
          <p className="text-slate-500 mt-1">Review and manage all authored questions.</p>
        </div>
        <a 
          href="/dashboard/setter"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Add Questions
        </a>
      </div>
      
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800">All Questions ({questions.length})</h3>
        </div>
        
        <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
          {questions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No questions found. Click "Add Questions" to create some.
            </div>
          ) : (
            questions.map((q) => {
              const options = JSON.parse(q.options) as string[];
              return (
                <div key={q.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <div className="flex-1">
                      <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded mb-2">
                        {q.category}
                      </span>
                      <p className="font-medium text-slate-900 leading-relaxed">
                        {q.text}
                      </p>
                      {q.imageUrl && (
                        <div className="mt-3">
                          <img src={q.imageUrl} alt="Question figure" className="max-h-48 rounded border shadow-sm" />
                        </div>
                      )}
                    </div>
                    <DeleteQuestionButton id={q.id} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm max-w-3xl">
                    {(() => {
                      const options = JSON.parse(q.options);
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
                            className={`p-3 rounded border ${
                              isCorrect 
                                ? 'bg-green-50 border-green-200 font-medium text-green-900' 
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="text-slate-400 mr-2">{String.fromCharCode(65 + idx)}.</span>
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
