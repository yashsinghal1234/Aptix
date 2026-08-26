"use client";

import React, { useState } from "react";
import { parseAndAnalyzeTextBlobAction, saveVerifiedQuestionsAction } from "@/app/actions/extract";
import {
  ParsedQuestionWithAI,
  FIXED_TOPICS,
  FIXED_DIFFICULTIES,
  FixedTopic,
  FixedDifficulty
} from "@/lib/ai-question-analyzer";

const SAMPLE_TEXT = `Q: A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?
A) 120 metres
B) 150 metres
C) 180 metres
D) 324 metres
Answer: B

Q: Which of the following data structures operates on a First-In-First-Out (FIFO) basis?
A) Stack
B) Queue
C) Binary Search Tree
D) Priority Queue
Answer: B

Q: If all Roses are Flowers and some Flowers fade quickly, which statement is definitively true?
A) All roses fade quickly
B) Some roses may fade quickly
C) No roses fade quickly
D) All flowers are roses
Answer: B`;

export function BulkUploadText() {
  const [textBlob, setTextBlob] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionWithAI[]>([]);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textBlob.trim()) {
      setError("Please enter or paste questions text.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await parseAndAnalyzeTextBlobAction(textBlob);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.questions && res.questions.length > 0) {
      setParsedQuestions(res.questions);
      setSuccessMsg(`Extracted ${res.questions.length} questions. Review the AI tagging and quality feedback below before saving.`);
    }
  };

  const handleUpdateField = (index: number, field: keyof ParsedQuestionWithAI, value: any) => {
    const updated = [...parsedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setParsedQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, newText: string) => {
    const updated = [...parsedQuestions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = { ...newOptions[optIndex], text: newText };
    updated[qIndex].options = newOptions;
    setParsedQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveAll = async (status: "DRAFT" | "SUBMITTED") => {
    if (parsedQuestions.length === 0) return;
    setSaving(true);
    setError(null);

    const res = await saveVerifiedQuestionsAction(parsedQuestions, status);
    setSaving(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg(`Successfully saved ${res.count} questions as ${status === "DRAFT" ? "Drafts" : "Submitted for Review"}!`);
      setParsedQuestions([]);
      setTextBlob("");
    }
  };

  const handleSaveSingle = async (index: number, status: "DRAFT" | "SUBMITTED") => {
    const targetQ = parsedQuestions[index];
    setSaving(true);
    setError(null);

    const res = await saveVerifiedQuestionsAction([targetQ], status);
    setSaving(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg(`Question saved successfully as ${status === "DRAFT" ? "Draft" : "Submitted"}.`);
      setParsedQuestions(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  return (
    <div className="space-y-8">
      {/* Paste & Extract Input Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">AI Paste & Parse Extractor</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste questions in standard text format. The AI engine applies fixed taxonomy tagging, distractor quality audits, and duplicate checks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTextBlob(SAMPLE_TEXT)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition-colors w-fit"
          >
            Load Sample Format
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleParse} className="space-y-4">
          <div>
            <textarea
              value={textBlob}
              onChange={(e) => setTextBlob(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none font-mono text-xs text-slate-800 bg-slate-50/50 leading-relaxed"
              placeholder={`Q: What is the output of 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 6\nAnswer: B`}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              Taxonomy: 8 Topics &bull; 3 Difficulty Levels &bull; Distractor Check
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing & Tagging...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Parse & Run AI Quality Check &rarr;
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Parsed Questions & AI Quality Feedback Deck */}
      {parsedQuestions.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-900 text-white p-5 rounded-2xl shadow-md">
            <div>
              <h4 className="font-extrabold text-base tracking-tight">
                Review & Confirm ({parsedQuestions.length} Questions Extracted)
              </h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                AI has auto-classified topics and audited distractor quality. You can edit any field or accept directly.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveAll("DRAFT")}
                className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 text-xs font-bold rounded-xl border border-indigo-700 transition-colors disabled:opacity-50"
              >
                Save All as Drafts
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveAll("SUBMITTED")}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl shadow transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Accept & Submit All"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {parsedQuestions.map((q, qIdx) => (
              <div
                key={q.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden transition-all"
              >
                {/* Card Header with AI Tagging Pills */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                      {qIdx + 1}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Question #{qIdx + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Fixed Topic Selector */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-soft-sm">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Topic:</span>
                      <select
                        value={q.category}
                        onChange={(e) => handleUpdateField(qIdx, "category", e.target.value as FixedTopic)}
                        className="text-xs font-bold text-indigo-700 bg-transparent outline-none cursor-pointer"
                      >
                        {FIXED_TOPICS.map((topic) => (
                          <option key={topic} value={topic}>
                            {topic}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fixed Difficulty Selector */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-soft-sm">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Difficulty:</span>
                      <select
                        value={q.difficultyLevel}
                        onChange={(e) => handleUpdateField(qIdx, "difficultyLevel", e.target.value as FixedDifficulty)}
                        className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                      >
                        {FIXED_DIFFICULTIES.map((diff) => (
                          <option key={diff} value={diff}>
                            {diff}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      {q.confidence}% AI Confidence
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Question Stem */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Question Stem
                    </label>
                    <textarea
                      value={q.text}
                      onChange={(e) => handleUpdateField(qIdx, "text", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none text-sm font-medium text-slate-900 bg-slate-50/40"
                    />
                  </div>

                  {/* Options & Correct Answer Radio */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Options (Select Radio for Correct Answer)
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Correct: Option {String.fromCharCode(65 + q.correctAnswerIndex)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswerIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleUpdateField(qIdx, "correctAnswerIndex", optIdx)}
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/50 shadow-soft-sm"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="radio"
                                name={`correct_${q.id}`}
                                checked={isCorrect}
                                onChange={() => handleUpdateField(qIdx, "correctAnswerIndex", optIdx)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </div>
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              className="w-full text-xs font-medium text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-indigo-400"
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                                Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Draft Explanation */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Draft Explanation (Why this is correct)
                    </label>
                    <textarea
                      value={q.draftExplanation}
                      onChange={(e) => handleUpdateField(qIdx, "draftExplanation", e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-xs font-medium text-slate-800 bg-slate-50/30"
                      placeholder="Step-by-step reasoning for candidates..."
                    />
                  </div>

                  {/* AI Quality & Sanity Audit Feedback Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          AI Item Quality & Sanity Audit
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                        Health Score: {q.qualityFeedback.overallScore}/10
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Distractor Quality */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-soft-sm">
                        <span className="font-bold text-slate-700 block mb-1">🔍 Distractor Health:</span>
                        <ul className="text-slate-600 space-y-1 text-[11px] list-disc list-inside">
                          {q.qualityFeedback.distractorCritique.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Ambiguity Check */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-soft-sm">
                        <span className="font-bold text-slate-700 block mb-1">⚖️ Ambiguity Check:</span>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              q.qualityFeedback.ambiguityStatus === "PASSED" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span
                            className={`font-bold text-[11px] ${
                              q.qualityFeedback.ambiguityStatus === "PASSED" ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {q.qualityFeedback.ambiguityStatus === "PASSED" ? "Single Valid Answer" : "Ambiguity Warning"}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-tight">
                          {q.qualityFeedback.ambiguityMessage}
                        </p>
                      </div>

                      {/* Duplicate Bank Check */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-soft-sm">
                        <span className="font-bold text-slate-700 block mb-1">🛡️ Question Bank Duplication:</span>
                        {q.qualityFeedback.duplicateMatch.found ? (
                          <div className="text-amber-700 text-[11px] font-medium leading-tight">
                            ⚠️ Similar question already in bank ({q.qualityFeedback.duplicateMatch.similarityScore}% match).
                          </div>
                        ) : (
                          <div className="text-emerald-700 text-[11px] font-medium flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                            Unique item (No duplicates found).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Single Question Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Delete / Skip
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveSingle(qIdx, "DRAFT")}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveSingle(qIdx, "SUBMITTED")}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                      >
                        Accept & Submit for Review &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
