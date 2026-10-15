"use client";

import React, { useState, useEffect } from "react";
import { getSubjectsAction, createSubjectAction } from "@/app/actions/subject";

interface SubjectItem {
  id: string;
  name: string;
  code?: string | null;
}

interface SubjectSelectorProps {
  name?: string;
  value?: string;
  onChange?: (subjectName: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export function SubjectSelector({
  name = "subject",
  value,
  onChange,
  required = false,
  className = "",
  placeholder = "Select or Add Subject...",
  label,
  disabled = false,
}: SubjectSelectorProps) {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selected, setSelected] = useState<string>(value || "");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const list = await getSubjectsAction();
      if (mounted) {
        setSubjects(list);
        if (!selected && list.length > 0 && !value) {
          // If no initial value, keep empty or select first if required
          if (required) {
            setSelected(list[0].name);
            onChange?.(list[0].name);
          }
        }
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (value !== undefined) {
      setSelected(value);
    }
  }, [value]);

  const handleSelect = (val: string) => {
    if (val === "__ADD_NEW__") {
      setShowAddModal(true);
      return;
    }
    setSelected(val);
    onChange?.(val);
  };

  const handleCreateSubject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubjectName.trim()) {
      setError("Please enter a subject name.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await createSubjectAction(newSubjectName.trim(), newSubjectCode.trim());
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else if (res.subject) {
      const added = res.subject;
      setSubjects((prev) => {
        if (prev.some((s) => s.name.toLowerCase() === added.name.toLowerCase())) return prev;
        return [...prev, added].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelected(added.name);
      onChange?.(added.name);
      setNewSubjectName("");
      setNewSubjectCode("");
      setShowAddModal(false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-[0.14em] mb-1.5">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            name={name}
            value={selected}
            disabled={disabled || loading}
            onChange={(e) => handleSelect(e.target.value)}
            required={required}
            className="w-full px-4 py-3 text-xs sm:text-sm bg-[#16171c] border border-white/10 rounded-2xl outline-none font-semibold text-white placeholder-neutral-500 hover:border-white/20 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all cursor-pointer disabled:opacity-50 appearance-none pr-9"
          >
            <option value="" disabled className="bg-[#121318] text-neutral-500">
              {loading ? "Loading subjects..." : placeholder}
            </option>
            {selected && !subjects.some((s) => s.name === selected) && (
              <option value={selected} className="bg-[#121318] text-white">
                {selected}
              </option>
            )}
            {subjects.map((s) => (
              <option key={s.id} value={s.name} className="bg-[#121318] text-white">
                {s.name} {s.code ? `(${s.code})` : ""}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowAddModal(true);
            }}
            title="Add a new subject"
            className="px-3.5 py-3 text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-2xl transition-all flex items-center gap-1.5 shrink-0 hover:border-lime-400/50 hover:text-lime-300 cursor-pointer active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Subject</span>
          </button>
        )}
      </div>

      {/* ── Add Subject Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0e1015] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div>
                <h3 className="text-base font-black text-white tracking-tight">Add New Academic Subject</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  e.g., Machine Learning, Discrete Mathematics, Operating Systems
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs font-semibold text-rose-300">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Subject Name <span className="text-lime-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Machine Learning, Mathematics"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreateSubject();
                    }
                  }}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-black/60 border border-white/15 rounded-xl text-white outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-colors font-medium placeholder-neutral-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Course / Subject Code <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS401, MATH102"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreateSubject();
                    }
                  }}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-black/60 border border-white/15 rounded-xl text-white outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-colors font-medium placeholder-neutral-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateSubject();
                  }}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-lime-400 hover:bg-lime-300 text-black shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? "Adding..." : "Add Subject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
