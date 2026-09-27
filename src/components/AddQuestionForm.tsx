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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

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
      setImagePreview(null);
      setOptionsList(["", "", "", ""]);
      setCorrectAnswer("0");
      setMultiCorrect([]);
      setBlanks([{ id: "1", accepted: "", points: 1, caseSensitive: false }]);
      setAiAnalysis(null);
      
      // Reset textarea and option fields in the DOM form
      if (formRef.current) {
        const textElem = formRef.current.elements.namedItem("text") as HTMLTextAreaElement;
        if (textElem) textElem.value = "";
        const imageElem = formRef.current.elements.namedItem("image") as HTMLInputElement;
        if (imageElem) imageElem.value = "";
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
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-extrabold text-emerald-400">
              Continuous Authoring Mode &bull; {batchCount} Question{batchCount > 1 ? 's' : ''} Created in this Session
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            Ready for Question #{batchCount + 1}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Authoring Column */}
        <div className={`${showPreview ? 'lg:col-span-7' : 'lg:col-span-12'} bg-[#0a0c10] p-6 sm:p-7 rounded-3xl border border-neutral-800 shadow-2xl relative transition-all`}>
          <form ref={formRef} action={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
              <div>
                <h3 className="font-extrabold text-white text-base">Author New Question</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Define stem, options, category tags, and distractors</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-bold text-neutral-300 bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-800 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{showPreview ? "Hide Live Preview" : "Show Live Preview"}</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-xs font-bold text-rose-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-xs font-bold text-emerald-300">
                {successMsg}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Question Type</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-white bg-neutral-900 focus:bg-black text-xs font-bold"
                >
                  <option value="MCQ_SINGLE">Multiple Choice (Single Answer)</option>
                  <option value="MCQ_MULTI">Multiple Choice (Multiple Correct Answers)</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="NUMERIC">Numeric Answer (With Tolerance)</option>
                  <option value="FILL_BLANK">Fill in the Blanks</option>
                </select>
              </div>

              <div>
                <label htmlFor="text" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>Question Stem {imagePreview ? <span className="text-neutral-500 font-normal normal-case">(Optional - image attached)</span> : <span className="text-neutral-500 font-normal normal-case">(Or attach image below)</span>}</span>
                  {qType === "FILL_BLANK" && <span className="text-emerald-400 font-normal ml-2 lowercase">Use [1], [2] to designate blanks.</span>}
                </label>
                <textarea
                  id="text"
                  name="text"
                  rows={3}
                  value={stemText}
                  onChange={(e) => setStemText(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-white text-xs leading-relaxed font-medium bg-neutral-900 focus:bg-black placeholder-neutral-600"
                  placeholder={qType === "FILL_BLANK" ? "e.g. The capital of France is [1] and its national symbol is [2]." : "e.g. A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train? (Optional if uploading diagram below)"}
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Diagram / Image Attachment (Optional)</label>
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-1.5 border border-neutral-800 rounded-xl text-xs text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700 transition-all"
                />
                {imagePreview && (
                  <div className="mt-2.5 p-2 bg-neutral-900 border border-neutral-800 rounded-2xl relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Selected attachment preview" 
                      className="max-h-40 rounded-xl object-contain border border-neutral-800 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        if (formRef.current) {
                          const imgInput = formRef.current.elements.namedItem("image") as HTMLInputElement;
                          if (imgInput) imgInput.value = "";
                        }
                      }}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md hover:bg-rose-700 transition-colors"
                      title="Remove Image"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {(qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Options & Distractors</label>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="p-3.5 border border-neutral-800 rounded-2xl bg-[#0d0f14] space-y-2.5">
                      <div className="flex gap-2.5 items-center">
                        <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-200 flex items-center justify-center font-black text-xs shrink-0 border border-neutral-700">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {qType === "MCQ_MULTI" && (
                          <input
                            type="checkbox"
                            checked={multiCorrect.includes(i)}
                            onChange={() => toggleMultiCorrect(i)}
                            className="w-4 h-4 text-emerald-500 rounded cursor-pointer shrink-0 accent-emerald-500"
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
                          className="flex-1 px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none font-medium text-white placeholder-neutral-600"
                          placeholder={`Option ${String.fromCharCode(65 + i)} text...`}
                        />
                      </div>
                      <input
                        id={`explanation${i}`}
                        name={`explanation${i}`}
                        type="text"
                        className="w-full px-3 py-1 text-[11px] bg-neutral-900/60 border border-neutral-800/80 rounded-lg focus:ring-1 focus:ring-neutral-700 outline-none text-neutral-300 placeholder-neutral-600"
                        placeholder="Optional feedback / why this option is correct or a distractor"
                      />
                    </div>
                  ))}
                </div>
              )}

              {qType === "TRUE_FALSE" && (
                <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs text-neutral-300 font-medium">
                  Options will be automatically set to <strong className="text-white">True</strong> and <strong className="text-white">False</strong>.
                </div>
              )}

              {qType === "NUMERIC" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Exact Target Answer</label>
                    <input
                      name="numericExact"
                      type="number"
                      step="any"
                      required={qType === "NUMERIC"}
                      className="w-full px-3 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-xs font-mono font-bold text-white bg-neutral-900"
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Allowed Tolerance (±)</label>
                    <input
                      name="numericTolerance"
                      type="number"
                      step="any"
                      defaultValue="0"
                      required={qType === "NUMERIC"}
                      className="w-full px-3 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-xs font-mono font-bold text-white bg-neutral-900"
                      placeholder="e.g. 0.5"
                    />
                  </div>
                </div>
              )}

              {qType === "FILL_BLANK" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Blanks Answers</label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-300 cursor-pointer">
                      <input type="checkbox" checked={partialCredit} onChange={e => setPartialCredit(e.target.checked)} className="rounded text-emerald-500 accent-emerald-500" />
                      Allow Partial Credit
                    </label>
                  </div>
                  <div className="border border-neutral-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs bg-neutral-900">
                      <thead className="bg-neutral-950 border-b border-neutral-800 font-bold text-neutral-400">
                        <tr>
                          <th className="px-3 py-2 w-16">Blank</th>
                          <th className="px-3 py-2">Accepted Answers (comma separated)</th>
                          <th className="px-3 py-2 w-20">Points</th>
                          <th className="px-3 py-2 w-24">Case Match</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800">
                        {blanks.map((b, idx) => (
                          <tr key={idx} className="bg-[#0d0f14]">
                            <td className="px-3 py-2 font-bold text-neutral-200">[{b.id}]</td>
                            <td className="px-3 py-2">
                              <input 
                                type="text" 
                                value={b.accepted} 
                                onChange={e => updateBlank(idx, "accepted", e.target.value)} 
                                className="w-full px-2 py-1 text-xs border border-neutral-800 rounded-lg bg-neutral-900 text-white"
                                placeholder="Paris, paris"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input 
                                type="number" 
                                step="0.5" 
                                value={b.points} 
                                onChange={e => updateBlank(idx, "points", parseFloat(e.target.value))} 
                                className="w-full px-2 py-1 text-xs border border-neutral-800 rounded-lg font-mono font-bold bg-neutral-900 text-white"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input 
                                type="checkbox" 
                                checked={b.caseSensitive} 
                                onChange={e => updateBlank(idx, "caseSensitive", e.target.checked)} 
                                className="rounded text-emerald-500 accent-emerald-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => removeBlank(idx)} className="text-rose-400 font-bold hover:text-rose-300">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={addBlank} className="text-xs text-neutral-300 hover:text-white font-bold underline">+ Add Blank</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t border-neutral-800 pt-4">
                {qType === "MCQ_SINGLE" && (
                  <div>
                    <label htmlFor="correctAnswer" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Correct Key</label>
                    <select
                      id="correctAnswer"
                      name="correctAnswer"
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-white bg-neutral-900 focus:bg-black text-xs font-bold"
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
                    <label htmlFor="correctAnswer" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Correct Key</label>
                    <select
                      id="correctAnswer"
                      name="correctAnswer"
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-white bg-neutral-900 focus:bg-black text-xs font-bold"
                    >
                      <option value="0">True</option>
                      <option value="1">False</option>
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="category" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Topic</label>
                  <select
                    id="category"
                    name="category"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-white bg-neutral-900 focus:bg-black text-xs font-bold"
                  >
                    {FIXED_TOPICS.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="difficultyLevel" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Difficulty</label>
                  <select
                    id="difficultyLevel"
                    name="difficultyLevel"
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-white bg-neutral-900 focus:bg-black text-xs font-bold"
                  >
                    {FIXED_DIFFICULTIES.map((diff) => (
                      <option key={diff} value={diff}>
                        {diff}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="points" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Points</label>
                  <input
                    id="points"
                    name="points"
                    type="number"
                    step="0.5"
                    value={pointsVal}
                    onChange={(e) => setPointsVal(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-white bg-neutral-900 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="negativePoints" className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Negative Pts</label>
                  <input
                    id="negativePoints"
                    name="negativePoints"
                    type="number"
                    step="0.1"
                    value={negPointsVal}
                    onChange={(e) => setNegPointsVal(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-white bg-neutral-900 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* AI Quality Audit Results Card (if triggered) */}
              {aiAnalysis && (
                <div className="bg-[#0d0f14] p-4 rounded-2xl border border-neutral-800 space-y-3 mt-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-extrabold text-white uppercase tracking-wide">
                        AI Quality & Distractor Audit Results
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      Score: {aiAnalysis.qualityFeedback.overallScore}/10
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <span className="font-bold text-neutral-200 block mb-1 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Distractor Health:
                      </span>
                      <ul className="text-neutral-400 text-[11px] list-disc list-inside space-y-1">
                        {aiAnalysis.qualityFeedback.distractorCritique.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <span className="font-bold text-neutral-200 block mb-1 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        Ambiguity Check:
                      </span>
                      <span className={`text-[11px] font-bold ${aiAnalysis.qualityFeedback.ambiguityStatus === "PASSED" ? "text-emerald-400" : "text-amber-400"}`}>
                        {aiAnalysis.qualityFeedback.ambiguityMessage}
                      </span>
                    </div>

                    <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                      <span className="font-bold text-neutral-200 block mb-1 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Question Bank:
                      </span>
                      <span className="text-[11px] font-medium text-neutral-400">
                        {aiAnalysis.qualityFeedback.duplicateMatch.found
                          ? `Similar question in bank (${aiAnalysis.qualityFeedback.duplicateMatch.similarityScore}% match)`
                          : "No duplicate found in question bank."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-neutral-800 flex flex-wrap gap-3 justify-between items-center">
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
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{analyzing ? "Auditing..." : "AI Quality Check"}</span>
              </button>

              <div className="flex flex-wrap gap-2.5 ml-auto">
                <button
                  type="submit"
                  onClick={() => setActionType("draft")}
                  disabled={loading}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-800 transition-colors disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  onClick={() => setActionType("submit")}
                  disabled={loading}
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center gap-1.5"
                  title="Ctrl + Enter to Save and add next"
                >
                  <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{loading ? "Saving..." : "Save & Add Another (Ctrl+Enter)"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live Candidate Preview Column */}
        {showPreview && (
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0a0c10] text-white p-5 rounded-3xl border border-neutral-800 shadow-2xl sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-300">Live Candidate Preview</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">
                  What students see
                </span>
              </div>

              <div className="space-y-4 text-left">
                {/* Meta Badge Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-neutral-300 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full uppercase">
                    {selectedTopic}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">
                    {selectedDifficulty}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 ml-auto">
                    +{pointsVal} / -{negPointsVal} pts
                  </span>
                </div>

                {/* Question Text & Diagram */}
                <div className="p-4 bg-[#0d0f14] rounded-2xl border border-neutral-800 min-h-[70px] space-y-3">
                  <p className="text-xs text-neutral-200 font-medium leading-relaxed">
                    {stemText || (imagePreview ? <span className="text-emerald-400 font-semibold italic">Refer to the attached diagram/figure below:</span> : <span className="text-neutral-500 italic">Type your question stem or attach an image on the left to preview...</span>)}
                  </p>
                  {imagePreview && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-neutral-800 bg-black p-1 flex justify-center">
                      <img 
                        src={imagePreview} 
                        alt="Question diagram preview" 
                        className="max-h-48 rounded-lg object-contain"
                      />
                    </div>
                  )}
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
                              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold"
                              : "bg-neutral-900/60 border-neutral-800 text-neutral-300"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[10px] ${
                            isCorrect ? "bg-emerald-500 text-black" : "bg-neutral-800 text-neutral-400"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1 truncate">
                            {optionsList[i] || <span className="text-neutral-500 italic">Option {String.fromCharCode(65 + i)}...</span>}
                          </span>
                          {isCorrect && (
                            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded">
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
                              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold"
                              : "bg-neutral-900/60 border-neutral-800 text-neutral-300"
                          }`}
                        >
                          <span className="flex-1">{opt}</span>
                          {isCorrect && <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded">KEY ✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] text-neutral-500 text-center pt-2 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span>Fast keyboard shortcut: Press <strong className="text-neutral-300 font-mono">Ctrl + Enter</strong> anywhere to submit and load the next question.</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
