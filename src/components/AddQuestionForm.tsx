"use client";

import { useRef, useState, useEffect } from "react";
import { createQuestionAction, checkDuplicateAction } from "@/app/actions/setter";
import { uploadImageAction } from "@/app/actions/upload";
import {
  FIXED_TOPICS,
  FIXED_DIFFICULTIES,
} from "@/lib/ai-question-analyzer";
import { SubjectSelector } from "@/components/SubjectSelector";

const QTYPES = [
  { v: "MCQ_SINGLE", label: "MCQ SINGLE" },
  { v: "MCQ_MULTI", label: "MCQ MULTI" },
  { v: "TRUE_FALSE", label: "TRUE / FALSE" },
  { v: "FILL_BLANK", label: "FILL BLANK" },
  { v: "NUMERIC", label: "NUMERIC" },
];

const PANEL = "rounded-2xl border border-white/10 bg-[#0e0f13] p-5";
const LABEL = "block text-[10px] font-bold text-neutral-500 uppercase tracking-[0.14em] mb-1.5";
const INPUT =
  "w-full px-3.5 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl outline-none transition-all font-medium text-white placeholder-neutral-600 hover:border-white/20 focus:border-lime-300/50";

export function AddQuestionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"draft" | "submit">("submit");
  const [batchCount, setBatchCount] = useState(0);

  const [qType, setQType] = useState("MCQ_SINGLE");
  const [stemText, setStemText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [optionsList, setOptionsList] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("0");
  const [pointsVal, setPointsVal] = useState("1.0");
  const [negPointsVal, setNegPointsVal] = useState("0.0");
  const [selectedTopic, setSelectedTopic] = useState<string>(FIXED_TOPICS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("MEDIUM");

  const [dupState, setDupState] = useState<{ checking: boolean; result: null | { similarity: number; isExact: boolean; matchedId: string | null; matchedStem: string } }>({
    checking: false,
    result: null,
  });

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
      setDupState({ checking: false, result: null });

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

  const runDuplicateCheck = async () => {
    if (!stemText.trim()) {
      setError("Type the question stem first, then run the duplicate check.");
      return;
    }
    setDupState({ checking: true, result: null });
    setError(null);
    try {
      const res = await checkDuplicateAction(stemText, selectedTopic);
      if ((res as any).error) {
        setError((res as any).error);
        setDupState({ checking: false, result: null });
      } else {
        setDupState({ checking: false, result: (res as any).match || null });
      }
    } catch {
      setDupState({ checking: false, result: null });
      setError("Duplicate check failed. The submit-time check still guards the bank.");
    }
  };

  const isCorrectIdx = (i: number) =>
    qType === "MCQ_MULTI" ? multiCorrect.includes(i) : correctAnswer === i.toString();

  return (
    <div className="space-y-4">
      {batchCount > 0 && (
        <p className="text-[11px] font-bold text-lime-200">
          Continuous authoring · {batchCount} question{batchCount > 1 ? "s" : ""} created this session · Ready for #{batchCount + 1}
        </p>
      )}

      <form ref={formRef} action={handleSubmit}>
        {/* Form actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
          <button
            type="submit"
            onClick={() => setActionType("draft")}
            disabled={loading}
            className="px-4 py-2 text-[11px] font-bold text-neutral-300 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            onClick={() => setActionType("submit")}
            disabled={loading}
            title="Ctrl + Enter to submit"
            className="px-5 py-2 text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? "Saving..." : "✓ Submit for Approval"}
          </button>
          <span className="text-[10px] font-bold text-neutral-500 border border-white/10 rounded-xl px-3 py-2">
            Publish: Unlisted
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-xs font-bold text-rose-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3.5 bg-lime-300/[0.07] border border-lime-300/25 rounded-2xl text-xs font-bold text-lime-200">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
          {/* Left column */}
          <div className="space-y-4 min-w-0">
            <div className={PANEL}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold text-white">Question content</h3>
                <span className="text-[9px] font-bold tracking-[0.14em] text-neutral-600">Q-DRAFT</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {QTYPES.map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setQType(t.v)}
                    className={`text-[10px] font-black tracking-wide px-3 py-1.5 rounded-lg border transition-all ${
                      qType === t.v
                        ? "text-lime-200 border-lime-300/50 bg-lime-300/10"
                        : "text-neutral-500 border-white/10 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <textarea
                id="text"
                name="text"
                rows={3}
                value={stemText}
                onChange={(e) => setStemText(e.target.value)}
                className={`${INPUT} resize-y leading-relaxed`}
                placeholder="e.g. For a non-zero real number x, x + 1/x = 5. What is the value of x² + 1/x²?"
              />
              <p className="mt-1.5 text-[10px] text-neutral-600">Set as formula · Attach image below</p>

              <div className="mt-3">
                <p className={LABEL}>Figure reference</p>
                <label className="block rounded-xl border border-dashed border-white/15 bg-black/40 px-4 py-5 text-center cursor-pointer hover:border-white/30 transition-colors">
                  <input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                  <span className="text-[11px] font-bold text-neutral-300">Drop figure or paste image URL</span>
                  <span className="block text-[10px] text-neutral-600 mt-0.5">Attached diagrams appear here</span>
                </label>
                {imagePreview && (
                  <div className="mt-2.5 p-2 bg-black/60 border border-white/10 rounded-xl relative inline-block">
                    <img src={imagePreview} alt="Selected attachment preview" className="max-h-40 rounded-lg object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        if (formRef.current) {
                          const imgInput = formRef.current.elements.namedItem("image") as HTMLInputElement;
                          if (imgInput) imgInput.value = "";
                        }
                      }}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-rose-700"
                      title="Remove Image"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {(qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") && (
                <div className="mt-4 space-y-2.5">
                  <p className={LABEL}>Answer options · select one correct answer</p>
                  {[0, 1, 2, 3].map((i) => {
                    const checked = isCorrectIdx(i);
                    return (
                      <div key={i}>
                        <label
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            checked
                              ? "border-lime-300/60 bg-lime-300/[0.06]"
                              : "border-white/10 bg-black/40 hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-black text-[10px] shrink-0 ${
                            checked ? "border-lime-300 text-lime-300" : "border-white/20 text-neutral-500"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          {qType === "MCQ_MULTI" && (
                            <input
                              type="checkbox"
                              checked={multiCorrect.includes(i)}
                              onChange={() => toggleMultiCorrect(i)}
                              className="w-4 h-4 accent-[#bef264] shrink-0"
                              title="Check if correct answer"
                            />
                          )}
                          {qType === "MCQ_SINGLE" && (
                            <input
                              type="radio"
                              name={`correctPick${i}`}
                              checked={checked}
                              onChange={() => setCorrectAnswer(i.toString())}
                              className="w-4 h-4 accent-[#bef264] shrink-0"
                            />
                          )}
                          <input
                            id={`option${i}`}
                            name={`option${i}`}
                            type="text"
                            required
                            value={optionsList[i]}
                            onChange={(e) => updateOptionText(i, e.target.value)}
                            className="flex-1 min-w-0 bg-transparent outline-none text-xs font-medium text-white placeholder-neutral-600"
                            placeholder={`${[21, 23, 25, 27][i]}`}
                          />
                          {checked && (
                            <span className="text-[9px] font-black text-lime-200 bg-lime-300/15 border border-lime-300/40 rounded px-1.5 py-0.5 shrink-0">
                              CORRECT
                            </span>
                          )}
                        </label>
                        <input
                          id={`explanation${i}`}
                          name={`explanation${i}`}
                          type="text"
                          className="mt-1.5 ml-9 w-[calc(100%-2.25rem)] px-3 py-1.5 text-[11px] bg-black/40 border border-white/[0.07] rounded-lg outline-none text-neutral-300 placeholder-neutral-600 focus:border-white/20"
                          placeholder="Why this option is correct or a distractor (optional)"
                        />
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-neutral-600">On review: 23. Option with key. May contain explanations.</p>
                  {/* Hidden correct key for single-answer */}
                  {qType === "MCQ_SINGLE" && (
                    <select name="correctAnswer" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} className="sr-only" aria-hidden tabIndex={-1}>
                      <option value="0">A</option>
                      <option value="1">B</option>
                      <option value="2">C</option>
                      <option value="3">D</option>
                    </select>
                  )}
                </div>
              )}

              {qType === "TRUE_FALSE" && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-neutral-300">Options auto-set to <strong className="text-white">True</strong> and <strong className="text-white">False</strong>.</p>
                  <select name="correctAnswer" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} className="text-xs bg-black border border-white/10 rounded-lg px-2.5 py-1.5 font-bold text-white outline-none cursor-pointer">
                    <option value="0">True</option>
                    <option value="1">False</option>
                  </select>
                </div>
              )}

              {qType === "NUMERIC" && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className={LABEL}>Exact target answer</p>
                    <input name="numericExact" type="number" step="any" required className={`${INPUT} font-mono`} placeholder="e.g. 150" />
                  </div>
                  <div>
                    <p className={LABEL}>Allowed tolerance (±)</p>
                    <input name="numericTolerance" type="number" step="any" defaultValue="0" required className={`${INPUT} font-mono`} placeholder="e.g. 0.5" />
                  </div>
                </div>
              )}

              {qType === "FILL_BLANK" && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className={LABEL + " !mb-0"}>Blanks answers · use [1], [2] in the stem</p>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-300 cursor-pointer">
                      <input type="checkbox" checked={partialCredit} onChange={(e) => setPartialCredit(e.target.checked)} className="accent-[#bef264]" />
                      Allow Partial Credit
                    </label>
                  </div>
                  {blanks.map((b, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-[11px] font-black text-neutral-400 w-8 shrink-0">[{b.id}]</span>
                      <input
                        type="text"
                        value={b.accepted}
                        onChange={(e) => updateBlank(idx, "accepted", e.target.value)}
                        className={`${INPUT} flex-1`}
                        placeholder="Accepted answers, comma separated"
                      />
                      <input
                        type="number"
                        step="0.5"
                        value={b.points}
                        onChange={(e) => updateBlank(idx, "points", parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-2.5 text-xs border border-white/10 rounded-xl font-mono font-bold bg-black/60 text-white outline-none"
                      />
                      <button type="button" onClick={() => removeBlank(idx)} className="text-neutral-600 hover:text-rose-400 font-bold px-1">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={addBlank} className="text-[11px] text-neutral-300 hover:text-white font-bold underline">+ Add Blank</button>
                </div>
              )}

              {qType === "MCQ_MULTI" && (
                <p className="mt-3 text-[10px] text-neutral-500">Tick every correct option above. Partial credit applies per the blueprint.</p>
              )}
            </div>
          </div>

          {/* Right rail */}
          <div className="space-y-4">
            <div className={PANEL}>
              <h4 className="text-[13px] font-bold text-white mb-3">Classification</h4>
              <SubjectSelector
                name="category"
                value={selectedTopic}
                onChange={(s) => setSelectedTopic(s)}
                label="Subject"
                placeholder="Choose or Add Subject..."
              />
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div>
                  <p className={LABEL}>Difficulty</p>
                  <select
                    name="difficultyLevel"
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className={`${INPUT} cursor-pointer font-bold`}
                  >
                    {FIXED_DIFFICULTIES.map((df) => (
                      <option key={df} value={df}>{df === "MEDIUM" ? "Medium" : df.charAt(0) + df.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className={LABEL}>Points</p>
                  <p className="px-3.5 py-2.5 text-xs font-mono font-bold text-lime-200 bg-lime-300/[0.07] border border-lime-300/25 rounded-xl tabular-nums">
                    {pointsVal || "2.0"}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 text-[10px] text-neutral-600">Tags: reciprocal, identities, algebra</p>
            </div>

            <div className={PANEL}>
              <h4 className="text-[13px] font-bold text-white mb-1">Quality checks</h4>
              {dupState.result ? (
                <div className="rounded-xl border border-[#f2a488]/30 bg-[#f2a488]/[0.06] p-3">
                  <p className="text-[11px] font-black text-[#f2a488]">
                    ⚠ Possible duplicate {dupState.result.similarity}%{dupState.result.isExact ? " · exact match" : ""}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
                    Compare with {dupState.result.matchedId ? dupState.result.matchedId.slice(-6).toUpperCase() : "bank"}: “{dupState.result.matchedStem}…”
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1.5">
                    Submit-time enforcement still blocks exact and ≥85% matches in this subject.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Pre-save duplicate scan (same Jaccard engine as submit-time enforcement).
                  </p>
                  <button
                    type="button"
                    onClick={runDuplicateCheck}
                    disabled={dupState.checking}
                    className="mt-2.5 text-[11px] font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {dupState.checking ? "Scanning bank…" : "⌕ Compare with bank"}
                  </button>
                </>
              )}
            </div>

            <div className={PANEL}>
              <h4 className="text-[13px] font-bold text-white mb-3">Candidate Live Preview</h4>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                <p className="text-[11px] text-neutral-200 font-medium leading-relaxed min-h-[28px]">
                  {stemText || <span className="text-neutral-600 italic">Type the stem to preview…</span>}
                </p>
                {(qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") && (
                  <div className="mt-2.5 space-y-1.5">
                    {[0, 1, 2, 3].map((i) => {
                      const on = qType === "MCQ_MULTI" ? multiCorrect.includes(i) : correctAnswer === i.toString();
                      return (
                        <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[11px] ${on ? "border-lime-300/60 bg-lime-300/[0.07] text-white font-bold" : "border-white/[0.07] text-neutral-400"}`}>
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-black ${on ? "border-lime-300 text-lime-300" : "border-white/20 text-neutral-600"}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="truncate">{optionsList[i] || <span className="italic">—</span>}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="mt-2 text-[10px] text-neutral-600">Preview reflects the current stem, selected answer, and stocked options.</p>
            </div>

            <div className={PANEL}>
              <h4 className="text-[13px] font-bold text-white mb-3">Marks & deduction</h4>
              <p className={LABEL}>Points value</p>
              <input
                name="points"
                type="number"
                step="0.5"
                value={pointsVal}
                onChange={(e) => setPointsVal(e.target.value)}
                className={`${INPUT} font-mono mb-3`}
              />
              <p className={LABEL}>Negative deduction</p>
              <input
                name="negativePoints"
                type="number"
                step="0.1"
                value={negPointsVal}
                onChange={(e) => setNegPointsVal(e.target.value)}
                className={`${INPUT} font-mono`}
              />
              <p className="mt-2 text-[10px] text-neutral-600">Negative marking is set by the exam blueprint; {negPointsVal} here.</p>
            </div>

            <div className={PANEL}>
              <h4 className="text-[13px] font-bold text-white mb-3">Actions</h4>
              <div className="space-y-2">
                <button
                  type="submit"
                  onClick={() => setActionType("draft")}
                  disabled={loading}
                  className="w-full py-2.5 text-[11px] font-bold text-neutral-300 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  onClick={() => setActionType("submit")}
                  disabled={loading}
                  className="w-full py-2.5 text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Submit for Approval"}
                </button>
                <p className="text-[10px] text-neutral-600 text-center">⌃ Ctrl+Enter quick save</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
