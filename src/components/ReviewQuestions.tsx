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
      <div className="bg-[#0a0c10] p-8 rounded-3xl border border-neutral-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center border border-neutral-800 shrink-0 shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </div>
          <div>
            <h4 className="font-extrabold text-base text-white">Your Question Bank is Empty</h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              No questions exist in this database yet. Add questions manually, parse raw text with AI, or import via CSV to start building your assessment library.
            </p>
          </div>
        </div>
        <a
          href="/dashboard/setter"
          className="px-5 py-2.5 text-xs font-bold text-black bg-white hover:bg-neutral-200 rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <span>Open Question Adder</span>
          <span>→</span>
        </a>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-md overflow-hidden">
      {/* Header & Tabs */}
      <div className="p-6 border-b border-neutral-800 bg-[#07080c] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-white text-base tracking-tight">Question Bank & Review Quality Queue</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Author submissions, quality validation, and bank management</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "PENDING"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>Pending Review</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${pendingList.length > 0 ? (activeTab === "PENDING" ? 'bg-amber-100 text-amber-900 font-black' : 'bg-amber-500/20 text-amber-300 font-black') : (activeTab === "PENDING" ? 'bg-neutral-200 text-black' : 'bg-neutral-800 text-neutral-400')}`}>
                {pendingList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("APPROVED")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "APPROVED"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>Approved</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "APPROVED" ? 'bg-neutral-200 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                {approvedList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("DRAFT")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "DRAFT"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>Drafts</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "DRAFT" ? 'bg-neutral-200 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                {draftList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-neutral-400 hover:text-white"
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
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <span>✓ Approve All ({pendingList.length})</span>
            </button>
          )}

          <a
            href="/dashboard/setter"
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
          >
            <span>+ Add Qs</span>
          </a>
        </div>
      </div>

      {/* List Container */}
      <div className="divide-y divide-neutral-800/80 max-h-[600px] overflow-y-auto">
        {displayList.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs">
            {activeTab === "PENDING" && "No questions currently awaiting review. All submissions are processed!"}
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
              <div key={q.id} className="p-6 hover:bg-neutral-900/30 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-extrabold bg-neutral-900 text-neutral-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-neutral-800">
                        {q.category}
                      </span>
                      <span className="text-[10px] font-extrabold bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-neutral-800">
                        {q.difficultyLevel || "MEDIUM"}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        q.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                        q.status === "SUBMITTED" ? "bg-amber-500/10 text-amber-300 border border-amber-500/30" :
                        q.status === "DRAFT" ? "bg-neutral-800 text-neutral-300 border border-neutral-700" :
                        "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}>
                        {q.status === "SUBMITTED" ? "Pending Review" : q.status}
                      </span>
                      {q.isExtracted && (
                        <span className="text-[10px] font-extrabold bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>AI Parsed</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-base">{q.text}</h4>
                    {q.imageUrl && (
                      <div className="mt-3">
                        <img 
                          src={q.imageUrl} 
                          alt="Question diagram / attachment" 
                          className="max-h-52 rounded-2xl border border-neutral-800 shadow-sm bg-black p-1 object-contain"
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
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        <span>✓</span>
                        <span>Approve</span>
                      </button>
                    )}
                    {q.status !== "REJECTED" && (
                      <button
                        onClick={() => handleReview(q.id, "REJECT")}
                        disabled={loadingId === q.id}
                        className="px-3 py-1.5 text-xs font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 rounded-xl transition-colors disabled:opacity-50 border border-rose-800/40 cursor-pointer"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>

                {/* Option Breakdown */}
                <div className="space-y-2 pl-4 border-l-2 border-neutral-700 mt-4">
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
                      <div key={idx} className={`p-3 rounded-xl flex items-start gap-3 text-xs ${isCorrect ? 'bg-emerald-950/20 border border-emerald-500/30' : 'bg-neutral-900/50 border border-neutral-800'}`}>
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 ${isCorrect ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-neutral-700'}`} />
                        <div className="flex-1">
                          <p className={`font-semibold ${isCorrect ? 'text-emerald-300 font-bold' : 'text-neutral-300'}`}>
                            {optText}
                          </p>
                          {opt.explanation && (
                            <p className="text-[11px] text-neutral-400 mt-1 italic">
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
