"use client";

import { useState } from "react";
import { reviewQuestionAction, approveAllQuestionsAction } from "@/app/actions/schedule";

export function ReviewQuestions({ questions }: { questions: any[] }) {
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "DRAFT" | "ALL">("PENDING");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const pendingList = questions.filter(q => q.status === "SUBMITTED");
  const approvedList = questions.filter(q => q.status === "APPROVED");
  const draftList = questions.filter(q => q.status === "DRAFT");
  const rejectedList = questions.filter(q => q.status === "REJECTED");

  let displayList: any[] = [];
  if (activeTab === "PENDING") displayList = pendingList;
  else if (activeTab === "APPROVED") displayList = approvedList;
  else if (activeTab === "DRAFT") displayList = draftList;
  else displayList = questions;

  const handleReview = async (id: string, action: "APPROVE" | "REJECT") => {
    setLoadingId(id);
    await reviewQuestionAction(id, action);
    setLoadingId(null);
  };

  const handleApproveAll = async () => {
    if (!confirm(`Are you sure you want to approve all ${pendingList.length} pending questions?`)) return;
    setBatchLoading(true);
    await approveAllQuestionsAction();
    setBatchLoading(false);
  };

  // If there are literally no questions anywhere in the database
  if (questions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0 shadow-soft-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </div>
          <div>
            <h4 className="font-extrabold text-base text-slate-900">Your Question Bank is Empty</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              No questions exist in this database yet. Add questions manually, parse raw text with AI, or import via CSV to start building your assessment library.
            </p>
          </div>
        </div>
        <a
          href="/dashboard/setter"
          className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all shrink-0 flex items-center gap-2"
        >
          <span>Open Question Adder</span>
          <span>→</span>
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
      {/* Header & Tabs */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Question Bank & Review Quality Queue</h3>
          <p className="text-xs text-slate-400 mt-0.5">Author submissions, quality validation, and bank management</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "PENDING"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Pending Review</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${pendingList.length > 0 ? 'bg-amber-100 text-amber-800 font-black' : 'bg-slate-100 text-slate-400'}`}>
                {pendingList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("APPROVED")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "APPROVED"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Approved</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-500">
                {approvedList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("DRAFT")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "DRAFT"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Drafts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-500">
                {draftList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({questions.length})
            </button>
          </div>

          {/* Batch Approve Button */}
          {pendingList.length > 0 && activeTab === "PENDING" && (
            <button
              onClick={handleApproveAll}
              disabled={batchLoading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <span>✓ Approve All ({pendingList.length})</span>
            </button>
          )}

          <a
            href="/dashboard/setter"
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
          >
            <span>+ Add Qs</span>
          </a>
        </div>
      </div>

      {/* List Container */}
      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {displayList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {activeTab === "PENDING" && "🎉 No questions currently awaiting review. All submissions are processed!"}
            {activeTab === "APPROVED" && "No questions have been approved yet."}
            {activeTab === "DRAFT" && "No draft questions found."}
            {activeTab === "ALL" && "No questions found."}
          </div>
        ) : (
          displayList.map(q => {
            let parsedOptions: any[] = [];
            try {
              parsedOptions = JSON.parse(q.options);
            } catch (e) {}

            return (
              <div key={q.id} className="p-6 hover:bg-slate-50/40 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-extrabold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-brand-100">
                        {q.category}
                      </span>
                      <span className="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {q.difficultyLevel || "MEDIUM"}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        q.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        q.status === "SUBMITTED" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        q.status === "DRAFT" ? "bg-slate-100 text-slate-600 border border-slate-200" :
                        "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}>
                        {q.status === "SUBMITTED" ? "Pending Review" : q.status}
                      </span>
                      {q.isExtracted && (
                        <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          🤖 AI Parsed
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-base">{q.text}</h4>
                    {q.imageUrl && (
                      <div className="mt-3">
                        <img 
                          src={q.imageUrl} 
                          alt="Question diagram / attachment" 
                          className="max-h-52 rounded-2xl border border-slate-200 shadow-sm bg-white p-1 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {q.status !== "APPROVED" && (
                      <button
                        onClick={() => handleReview(q.id, "APPROVE")}
                        disabled={loadingId === q.id}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1"
                      >
                        <span>✓</span>
                        <span>Approve</span>
                      </button>
                    )}
                    {q.status !== "REJECTED" && (
                      <button
                        onClick={() => handleReview(q.id, "REJECT")}
                        disabled={loadingId === q.id}
                        className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50 border border-rose-100"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>

                {/* Option Breakdown */}
                <div className="space-y-2 pl-4 border-l-2 border-brand-200 mt-4">
                  {parsedOptions.map((opt: any, idx: number) => {
                    let correctAnsText = "";
                    try {
                      const parsedAns = JSON.parse(q.answerData);
                      correctAnsText = parsedAns.correctAnswer || (q as any).correctAnswer;
                    } catch (e) {
                      correctAnsText = (q as any).correctAnswer;
                    }

                    const optText = typeof opt === "string" ? opt : opt.text;
                    const isCorrect = correctAnsText === optText;
                    return (
                      <div key={idx} className={`p-3 rounded-xl flex items-start gap-3 text-xs ${isCorrect ? 'bg-emerald-50/70 border border-emerald-200' : 'bg-slate-50 border border-slate-100'}`}>
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 ${isCorrect ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <div className="flex-1">
                          <p className={`font-semibold ${isCorrect ? 'text-emerald-900 font-bold' : 'text-slate-700'}`}>
                            {optText}
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
          })
        )}
      </div>
    </div>
  );
}
