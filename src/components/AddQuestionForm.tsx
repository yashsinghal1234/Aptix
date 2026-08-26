"use client";

import { useRef, useState } from "react";
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
  const [actionType, setActionType] = useState<"draft" | "submit">("draft");
  
  const [qType, setQType] = useState("MCQ_SINGLE");
  const [multiCorrect, setMultiCorrect] = useState<number[]>([]);
  const [blanks, setBlanks] = useState([{ id: "1", accepted: "", points: 1, caseSensitive: false }]);
  const [partialCredit, setPartialCredit] = useState(true);

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
      setSuccessMsg(actionType === "draft" ? "Saved as draft successfully." : "Submitted for review successfully.");
      formRef.current?.reset();
      setMultiCorrect([]);
      setBlanks([{ id: "1", accepted: "", points: 1, caseSensitive: false }]);
    }
  }

  const toggleMultiCorrect = (idx: number) => {
    setMultiCorrect(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
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
    <div className="bg-white p-6 rounded-xl border shadow-sm relative">
      <form ref={formRef} action={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center pb-4 border-b">
          <h3 className="font-semibold text-slate-800 text-lg">Author New Question</h3>
          {error && <span className="text-red-600 text-sm font-medium">{error}</span>}
          {successMsg && <span className="text-green-600 text-sm font-medium">{successMsg}</span>}
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
            <select
              value={qType}
              onChange={(e) => setQType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
            >
              <option value="MCQ_SINGLE">Multiple Choice (Single Answer)</option>
              <option value="MCQ_MULTI">Multiple Choice (Multiple Answers)</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="NUMERIC">Numeric Answer (With Tolerance)</option>
              <option value="FILL_BLANK">Fill in the Blanks</option>
            </select>
          </div>

          <div>
            <label htmlFor="text" className="block text-sm font-medium text-slate-700 mb-1">
              Question Stem
              {qType === "FILL_BLANK" && <span className="text-indigo-600 font-normal ml-2">Use [1], [2] to mark blanks.</span>}
            </label>
            <textarea
              id="text"
              name="text"
              required
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
              placeholder={qType === "FILL_BLANK" ? "The capital of France is [1]." : "e.g. What is the next prime number after 31?"}
            />
          </div>

          <div>
            <label htmlFor="image" className="block text-sm font-medium text-slate-700 mb-1">Image Attachment (Optional)</label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all"
            />
          </div>

          {(qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Options & Distractors</label>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-lg bg-slate-50 items-start">
                  <div className="pt-2 text-sm font-bold text-slate-400">#{i+1}</div>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3 items-center">
                      {qType === "MCQ_MULTI" && (
                        <input
                          type="checkbox"
                          checked={multiCorrect.includes(i)}
                          onChange={() => toggleMultiCorrect(i)}
                          className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                        />
                      )}
                      <input
                        id={`option${i}`}
                        name={`option${i}`}
                        type="text"
                        required={qType === "MCQ_SINGLE" || qType === "MCQ_MULTI"}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Option text..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 w-24">Image:</span>
                      <input
                        id={`optionImage${i}`}
                        name={`optionImage${i}`}
                        type="file"
                        accept="image/*"
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                      />
                    </div>
                    <input
                      id={`explanation${i}`}
                      name={`explanation${i}`}
                      type="text"
                      className="w-full px-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 outline-none text-slate-600"
                      placeholder="Optional: Why is this wrong? (Feedback for reviewer)"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {qType === "TRUE_FALSE" && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Options configured automatically as True / False.</label>
            </div>
          )}

          {qType === "NUMERIC" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exact Answer</label>
                <input
                  name="numericExact"
                  type="number"
                  step="any"
                  required={qType === "NUMERIC"}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. 3.14"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tolerance (±)</label>
                <input
                  name="numericTolerance"
                  type="number"
                  step="any"
                  defaultValue="0"
                  required={qType === "NUMERIC"}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. 0.05"
                />
              </div>
            </div>
          )}

          {qType === "FILL_BLANK" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700">Blanks Configuration</label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={partialCredit} onChange={e => setPartialCredit(e.target.checked)} className="rounded text-indigo-600" />
                  Allow Partial Credit
                </label>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm bg-slate-50">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-4 py-2 font-medium text-slate-600 w-16">Blank</th>
                      <th className="px-4 py-2 font-medium text-slate-600">Accepted Answers (comma separated)</th>
                      <th className="px-4 py-2 font-medium text-slate-600 w-24">Points</th>
                      <th className="px-4 py-2 font-medium text-slate-600 w-32">Case Sensitive</th>
                      <th className="px-4 py-2 font-medium text-slate-600 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {blanks.map((b, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="px-4 py-2 font-medium text-indigo-600">[{b.id}]</td>
                        <td className="px-4 py-2">
                          <input 
                            type="text" 
                            value={b.accepted} 
                            onChange={e => updateBlank(idx, "accepted", e.target.value)} 
                            className="w-full px-2 py-1 border rounded"
                            placeholder="apple, apples"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            step="0.5" 
                            value={b.points} 
                            onChange={e => updateBlank(idx, "points", parseFloat(e.target.value))} 
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={b.caseSensitive} 
                            onChange={e => updateBlank(idx, "caseSensitive", e.target.checked)} 
                            className="rounded text-indigo-600"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button type="button" onClick={() => removeBlank(idx)} className="text-red-500 hover:text-red-700">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addBlank} className="text-sm text-indigo-600 font-medium">+ Add Blank</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
            {qType === "MCQ_SINGLE" && (
              <div>
                <label htmlFor="correctAnswer" className="block text-sm font-medium text-slate-700 mb-1">Correct Answer</label>
                <select
                  id="correctAnswer"
                  name="correctAnswer"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                >
                  <option value="0">Option 1</option>
                  <option value="1">Option 2</option>
                  <option value="2">Option 3</option>
                  <option value="3">Option 4</option>
                </select>
              </div>
            )}
            {qType === "TRUE_FALSE" && (
              <div>
                <label htmlFor="correctAnswer" className="block text-sm font-medium text-slate-700 mb-1">Correct Answer</label>
                <select
                  id="correctAnswer"
                  name="correctAnswer"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                >
                  <option value="0">True</option>
                  <option value="1">False</option>
                </select>
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="category" className="block text-sm font-medium text-slate-700">Topic</label>
                {aiAnalysis && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    AI Suggested
                  </span>
                )}
              </div>
              <select
                id="category"
                name="category"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white text-xs font-semibold"
              >
                {FIXED_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="difficultyLevel" className="block text-sm font-medium text-slate-700">Difficulty</label>
                {aiAnalysis && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {aiAnalysis.confidence}% Conf.
                  </span>
                )}
              </div>
              <select
                id="difficultyLevel"
                name="difficultyLevel"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white text-xs font-semibold"
              >
                {FIXED_DIFFICULTIES.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="points" className="block text-sm font-medium text-slate-700 mb-1">Points</label>
              <input
                id="points"
                name="points"
                type="number"
                step="0.5"
                defaultValue="1.0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="negativePoints" className="block text-sm font-medium text-slate-700 mb-1">Negative Pts</label>
              <input
                id="negativePoints"
                name="negativePoints"
                type="number"
                step="0.1"
                defaultValue="0.0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
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

        <div className="pt-6 border-t flex flex-wrap gap-3 justify-between items-center">
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
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {analyzing ? "Auditing..." : "✨ AI Quality & Tagging Check"}
          </button>

          <div className="flex gap-3 ml-auto">
            <button
              type="submit"
              onClick={() => setActionType("draft")}
              disabled={loading}
              className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-70"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              onClick={() => setActionType("submit")}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2 shadow-sm"
            >
              {loading && actionType === "submit" ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
