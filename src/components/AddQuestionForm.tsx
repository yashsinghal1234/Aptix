"use client";

import { useRef, useState, useEffect } from "react";
import { createQuestionAction } from "@/app/actions/setter";
import { uploadImageAction } from "@/app/actions/upload";
import { analyzeSingleQuestionAction } from "@/app/actions/extract";
import {
  FIXED_TOPICS,
  FIXED_DIFFICULTIES,
  ParsedQuestionWithAI
} from "@/lib/ai-question-analyzer";

export function AddQuestionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ParsedQuestionWithAI | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>(FIXED_TOPICS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"draft" | "submit">("submit");
  const [keepForm, setKeepForm] = useState(true);
  const [batchCount, setBatchCount] = useState(0);

  const [qType, setQType] = useState("MCQ_SINGLE");
  const [stemText, setStemText] = useState("");
  const [optionsList, setOptionsList] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("0");
  const [pointsVal, setPointsVal] = useState("1.0");
  const [negPointsVal, setNegPointsVal] = useState("0.0");
  const [showPreview, setShowPreview] = useState(true);

  const [multiCorrect, setMultiCorrect] = useState<number[]>([]);
  const [blanks, setBlanks] = useState([{ id: "1", accepted: "", points: 1, caseSensitive: false }]);
  const [partialCredit, setPartialCredit] = useState(true);

  // Keyboard shortcut: Ctrl + Enter to quickly Save and Add Another
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    formData.append("actionType", actionType);
    formData.append("qType", qType);
    formData.append("multiCorrect", JSON.stringify(multiCorrect));
    formData.append("blanksData", JSON.stringify(blanks));
    formData.append("partialCredit", JSON.stringify(partialCredit));

    const imageFile = formData.get("image") as File;
    let imageUrl = null;

    if (imageFile && imageFile.size > 0) {
      const imgData = new FormData();
      imgData.append("image", imageFile);
      const uploadRes = await uploadImageAction(imgData);
      
      if (uploadRes.error) {
        setError(uploadRes.error);
        setLoading(false);
        return;
      }
      imageUrl = uploadRes.url;
    }

    if (imageUrl) {
      formData.append("imageUrl", imageUrl);
    }

    const res = await createQuestionAction(formData);
    setLoading(false);
    
    if (res.error) {
      setError(res.error);
    } else {
      const newCount = batchCount + 1;
      setBatchCount(newCount);
      setSuccessMsg(`✓ Question #${newCount} successfully saved! Form ready for next question.`);
      
      // Reset inputs while keeping topic, difficulty & question type for fast authoring
      setStemText("");
      setOptionsList(["", "", "", ""]);
      setCorrectAnswer("0");
      setMultiCorrect([]);
      setBlanks([{ id: "1", accepted: "", points: 1, caseSensitive: false }]);
      setAiAnalysis(null);
      
      // Reset textarea and option fields in the DOM form
      if (formRef.current) {
        const textElem = formRef.current.elements.namedItem("text") as HTMLTextAreaElement;
        if (textElem) textElem.value = "";
        [0, 1, 2, 3].forEach(i => {
          const optElem = formRef.current?.elements.namedItem(`option${i}`) as HTMLInputElement;
          if (optElem) optElem.value = "";
          const expElem = formRef.current?.elements.namedItem(`explanation${i}`) as HTMLInputElement;
          if (expElem) expElem.value = "";
        });
        textElem?.focus();
      }
    }
  }

  const toggleMultiCorrect = (idx: number) => {
    setMultiCorrect(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const updateOptionText = (idx: number, val: string) => {
    setOptionsList(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const addBlank = () => {
    setBlanks(prev => [...prev, { id: (prev.length + 1).toString(), accepted: "", points: 1, caseSensitive: false }]);
  };

  const updateBlank = (idx: number, field: string, val: any) => {
    const newBlanks = [...blanks];
    newBlanks[idx] = { ...newBlanks[idx], [field]: val };
    setBlanks(newBlanks);
  };

  const removeBlank = (idx: number) => {
    setBlanks(prev => prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, id: (i + 1).toString() })));
  };

  return (
    <div className="space-y-6">
      {/* Session Progress Header */}
      {batchCount > 0 && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-extrabold text-emerald-900">
              Continuous Authoring Mode &bull; {batchCount} Question{batchCount > 1 ? 's' : ''} Created in this Session
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            Ready for Question #{batchCount + 1}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Authoring Column */}
        <div className={`${showPreview ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-soft relative transition-all`}>
          <form ref={formRef} action={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Author New Question</h3>
                <p className="text-xs text-slate-400 mt-0.5">Define stem, options, category tags, and distractors</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <span>{showPreview ? "👁️ Hide Preview" : "👁️ Show Live Preview"}</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
                ⚠️ {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800">
                {successMsg}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Question Type</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-slate-50 focus:bg-white text-xs font-bold"
                >
                  <option value="MCQ_SINGLE">Multiple Choice (Single Answer)</option>
                  <option value="MCQ_MULTI">Multiple Choice (Multiple Correct Answers)</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="NUMERIC">Numeric Answer (With Tolerance)</option>
                  <option value="FILL_BLANK">Fill in the Blanks</option>
                </select>
              </div>

              <div>
                <label htmlFor="text" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Question Stem
                  {qType === "FILL_BLANK" && <span className="text-indigo-600 font-normal ml-2 lowercase">Use [1], [2] to designate blanks.</span>}
                </label>
                <textarea
                  id="text"
                  name="text"
                  required
                  rows={3}
                  value={stemText}
                  onChange={(e) => setStemText(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-xs leading-relaxed font-medium bg-slate-50 focus:bg-white"
                  placeholder={qType === "FILL_BLANK" ? "e.g. The capital of France is [1] and its national symbol is [2]." : "e.g. A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?"}
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Diagram / Image Attachment (Optional)</label>
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all"
                />
              </div>

              {(qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Options & Distractors</label>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="p-3.5 border border-slate-200/80 rounded-2xl bg-slate-50/60 space-y-2.5">
                      <div className="flex gap-2.5 items-center">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-xs shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {qType === "MCQ_MULTI" && (
                          <input
                            type="checkbox"
                            checked={multiCorrect.includes(i)}
                            onChange={() => toggleMultiCorrect(i)}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0"
                            title="Check if correct answer"
                          />
                        )}
                        <input
                          id={`option${i}`}
                          name={`option${i}`}
                          type="text"
                          required={qType === "MCQ_SINGLE" || qType === "MCQ_MULTI"}
                          value={optionsList[i]}
                          onChange={(e) => updateOptionText(i, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900"
                          placeholder={`Option ${String.fromCharCode(65 + i)} text...`}
                        />
                      </div>
                      <input
                        id={`explanation${i}`}
                        name={`explanation${i}`}
                        type="text"
                        className="w-full px-3 py-1 text-[11px] bg-white border border-slate-200/80 rounded-lg focus:ring-1 focus:ring-slate-400 outline-none text-slate-600"
                        placeholder="Optional feedback / why this option is correct or a distractor"
                      />
                    </div>
                  ))}
                </div>
              )}

              {qType === "TRUE_FALSE" && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 font-medium">
                  Options will be automatically set to <strong>True</strong> and <strong>False</strong>.
                </div>
              )}

              {qType === "NUMERIC" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Exact Target Answer</label>
                    <input
                      name="numericExact"
                      type="number"
                      step="any"
                      required={qType === "NUMERIC"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono font-bold"
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Allowed Tolerance (±)</label>
                    <input
                      name="numericTolerance"
                      type="number"
                      step="any"
                      defaultValue="0"
                      required={qType === "NUMERIC"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono font-bold"
                      placeholder="e.g. 0.5"
                    />
                  </div>
                </div>
              )}

              {qType === "FILL_BLANK" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Blanks Answers</label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={partialCredit} onChange={e => setPartialCredit(e.target.checked)} className="rounded text-indigo-600" />
                      Allow Partial Credit
                    </label>
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs bg-slate-50">
                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th className="px-3 py-2 w-16">Blank</th>
                          <th className="px-3 py-2">Accepted Answers (comma separated)</th>
                          <th className="px-3 py-2 w-20">Points</th>
                          <th className="px-3 py-2 w-24">Case Match</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {blanks.map((b, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-3 py-2 font-bold text-indigo-600">[{b.id}]</td>
                            <td className="px-3 py-2">
                              <input 
                                type="text" 
                                value={b.accepted} 
                                onChange={e => updateBlank(idx, "accepted", e.target.value)} 
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg"
                                placeholder="Paris, paris"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input 
                                type="number" 
                                step="0.5" 
                                value={b.points} 
                                onChange={e => updateBlank(idx, "points", parseFloat(e.target.value))} 
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg font-mono font-bold"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input 
                                type="checkbox" 
                                checked={b.caseSensitive} 
                                onChange={e => updateBlank(idx, "caseSensitive", e.target.checked)} 
                                className="rounded text-indigo-600"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => removeBlank(idx)} className="text-red-500 font-bold hover:text-red-700">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={addBlank} className="text-xs text-indigo-600 font-bold hover:underline">+ Add Blank</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t border-slate-100 pt-4">
                {qType === "MCQ_SINGLE" && (
                  <div>
                    <label htmlFor="correctAnswer" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Correct Key</label>
                    <select
                      id="correctAnswer"
                      name="correctAnswer"
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-slate-50 focus:bg-white text-xs font-bold"
                    >
                      <option value="0">Option A</option>
                      <option value="1">Option B</option>
                      <option value="2">Option C</option>
                      <option value="3">Option D</option>
                    </select>
                  </div>
                )}
                {qType === "TRUE_FALSE" && (
                  <div>
                    <label htmlFor="correctAnswer" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Correct Key</label>
                    <select
                      id="correctAnswer"
                      name="correctAnswer"
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-slate-50 focus:bg-white text-xs font-bold"
                    >
                      <option value="0">True</option>
                      <option value="1">False</option>
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="category" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Topic</label>
                  <select
                    id="category"
                    name="category"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-slate-50 focus:bg-white text-xs font-bold"
                  >
                    {FIXED_TOPICS.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="difficultyLevel" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Difficulty</label>
                  <select
                    id="difficultyLevel"
                    name="difficultyLevel"
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-slate-50 focus:bg-white text-xs font-bold"
                  >
                    {FIXED_DIFFICULTIES.map((diff) => (
                      <option key={diff} value={diff}>
                        {diff}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="points" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Points</label>
                  <input
                    id="points"
                    name="points"
                    type="number"
                    step="0.5"
                    value={pointsVal}
                    onChange={(e) => setPointsVal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="negativePoints" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Negative Pts</label>
                  <input
                    id="negativePoints"
                    name="negativePoints"
                    type="number"
                    step="0.1"
                    value={negPointsVal}
                    onChange={(e) => setNegPointsVal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* AI Quality Audit Results Card (if triggered) */}
              {aiAnalysis && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 mt-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                        AI Quality & Distractor Audit Results
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      Score: {aiAnalysis.qualityFeedback.overallScore}/10
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1">🔍 Distractor Health:</span>
                      <ul className="text-slate-600 text-[11px] list-disc list-inside space-y-1">
                        {aiAnalysis.qualityFeedback.distractorCritique.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1">⚖️ Ambiguity Check:</span>
                      <span className={`text-[11px] font-bold ${aiAnalysis.qualityFeedback.ambiguityStatus === "PASSED" ? "text-emerald-700" : "text-amber-700"}`}>
                        {aiAnalysis.qualityFeedback.ambiguityMessage}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1">🛡️ Question Bank:</span>
                      <span className="text-[11px] font-medium text-slate-600">
                        {aiAnalysis.qualityFeedback.duplicateMatch.found
                          ? `⚠️ Similar question in bank (${aiAnalysis.qualityFeedback.duplicateMatch.similarityScore}% match)`
                          : "✅ No duplicate found in question bank."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-slate-100 flex flex-wrap gap-3 justify-between items-center">
              <button
                type="button"
                disabled={analyzing}
                onClick={async () => {
                  if (!formRef.current) return;
                  const text = (formRef.current.elements.namedItem("text") as HTMLTextAreaElement)?.value;
                  if (!text) {
                    setError("Please fill in the question text first.");
                    return;
                  }
                  setAnalyzing(true);
                  setError(null);
                  const opts = [0, 1, 2, 3].map(
                    (i) => (formRef.current?.elements.namedItem(`option${i}`) as HTMLInputElement)?.value || `Option ${i+1}`
                  );
                  const correct = parseInt((formRef.current.elements.namedItem("correctAnswer") as HTMLSelectElement)?.value || "0", 10);
                  const res = await analyzeSingleQuestionAction(text, opts, correct);
                  setAnalyzing(false);
                  if (res.analysis) {
                    setAiAnalysis(res.analysis);
                    setSelectedTopic(res.analysis.category);
                    setSelectedDifficulty(res.analysis.difficultyLevel);
                  }
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {analyzing ? "Auditing..." : "✨ AI Quality Check"}
              </button>

              <div className="flex flex-wrap gap-2.5 ml-auto">
                <button
                  type="submit"
                  onClick={() => setActionType("draft")}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  onClick={() => setActionType("submit")}
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                  title="Ctrl + Enter to Save and add next"
                >
                  {loading ? "Saving..." : "✨ Save & Add Another (Ctrl+Enter)"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live Candidate Preview Column */}
        {showPreview && (
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-soft sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Live Candidate Preview</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  What students see
                </span>
              </div>

              <div className="space-y-4 text-left">
                {/* Meta Badge Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded-full uppercase">
                    {selectedTopic}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {selectedDifficulty}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 ml-auto">
                    +{pointsVal} / -{negPointsVal} pts
                  </span>
                </div>

                {/* Question Text */}
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 min-h-[70px]">
                  <p className="text-xs text-slate-100 font-medium leading-relaxed">
                    {stemText || <span className="text-slate-500 italic">Type your question stem on the left to preview...</span>}
                  </p>
                </div>

                {/* Options Preview */}
                {(qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") && (
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((i) => {
                      const isCorrect = qType === "MCQ_MULTI" 
                        ? multiCorrect.includes(i)
                        : correctAnswer === i.toString();

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                            isCorrect
                              ? "bg-emerald-950/50 border-emerald-500 text-emerald-100 font-semibold"
                              : "bg-slate-800/60 border-slate-700 text-slate-300"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[10px] ${
                            isCorrect ? "bg-emerald-500 text-slate-900" : "bg-slate-700 text-slate-400"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1 truncate">
                            {optionsList[i] || <span className="text-slate-600 italic">Option {String.fromCharCode(65 + i)}...</span>}
                          </span>
                          {isCorrect && (
                            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-900/60 px-1.5 py-0.5 rounded">
                              KEY ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {qType === "TRUE_FALSE" && (
                  <div className="space-y-2">
                    {["True", "False"].map((opt, i) => {
                      const isCorrect = correctAnswer === i.toString();
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                            isCorrect
                              ? "bg-emerald-950/50 border-emerald-500 text-emerald-100 font-semibold"
                              : "bg-slate-800/60 border-slate-700 text-slate-300"
                          }`}
                        >
                          <span className="flex-1">{opt}</span>
                          {isCorrect && <span className="text-[10px] font-extrabold text-emerald-400">KEY ✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] text-slate-500 text-center pt-2">
                  ⌨️ Fast keyboard shortcut: Press <strong className="text-slate-400 font-mono">Ctrl + Enter</strong> anywhere to submit and load the next question.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
