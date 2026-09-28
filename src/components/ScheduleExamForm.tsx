"use client";

import { useState } from "react";
import { createScheduledExamAction } from "@/app/actions/schedule";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FIXED_TOPICS } from "@/lib/ai-question-analyzer";

export function ScheduleExamForm({ allQuestions }: { allQuestions: any[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleQuestion = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError("Please select at least one question.");
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("timezoneOffset", new Date().getTimezoneOffset().toString());

    const startTimeVal = formData.get("startTime") as string;
    if (startTimeVal) {
      const localDate = new Date(startTimeVal);
      if (!isNaN(localDate.getTime())) {
        formData.set("startTime", localDate.toISOString());
      }
    }
    
    const res = await createScheduledExamAction(formData, Array.from(selectedIds));
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/dashboard/owner");
    }
  };

  const [filterTopic, setFilterTopic] = useState("");
  const [filterDiff, setFilterDiff] = useState("");

  const filteredQuestions = allQuestions.filter(q => {
    if (filterTopic && q.category !== filterTopic) return false;
    if (filterDiff && q.difficultyLevel !== filterDiff) return false;
    return true;
  });

  const selectAllFiltered = () => {
    const newSet = new Set(selectedIds);
    filteredQuestions.forEach(q => newSet.add(q.id));
    setSelectedIds(newSet);
  };

  const deselectAllFiltered = () => {
    const newSet = new Set(selectedIds);
    filteredQuestions.forEach(q => newSet.delete(q.id));
    setSelectedIds(newSet);
  };

  const isAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.has(q.id));
  const isSomeFilteredSelected = filteredQuestions.some(q => selectedIds.has(q.id)) && !isAllFilteredSelected;

  const toggleAllFiltered = () => {
    if (isAllFilteredSelected) {
      deselectAllFiltered();
    } else {
      selectAllFiltered();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-12">
      {error && (
        <div className="bg-rose-950/40 text-rose-400 border border-rose-800/50 p-4 rounded-2xl text-xs font-bold">
          {error}
        </div>
      )}

      {/* Basic Settings */}
      <div className="bg-[#0a0c10] p-8 rounded-3xl border border-neutral-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-xl font-bold text-white">Custom One-Off Exam Settings</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Quickly schedule an exam session by manually picking questions</p>
          </div>
          <Link
            href="/dashboard/owner/template/new"
            className="text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-3.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Need full blueprint? Create Template</span>
            <span>&rarr;</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Title</label>
            <input 
              type="text" 
              name="title" 
              required 
              placeholder="e.g. Mid-term Assessment"
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Subject</label>
            <input 
              type="text" 
              name="subject" 
              required 
              placeholder="e.g. Computer Science"
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Start Time</label>
            <input 
              type="datetime-local" 
              name="startTime" 
              required 
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Duration (Minutes)</label>
            <input 
              type="number" 
              name="durationMinutes" 
              required 
              min="1"
              defaultValue="60"
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none text-xs"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Fixed Question Selection */}
        <div className="bg-[#0a0c10] p-8 rounded-3xl border border-neutral-800 shadow-md flex flex-col max-h-[600px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Select Questions</h3>
              <p className="text-xs text-neutral-400 mt-1">Pick specific questions from the bank for this session.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-300 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                {selectedIds.size} of {allQuestions.length} Selected
              </span>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                Select All {filteredQuestions.length > 0 ? `(${filteredQuestions.length})` : ''}
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-bold text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 border border-neutral-800 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <select 
              className="px-3 py-2 text-xs border border-neutral-800 rounded-xl bg-neutral-900 flex-1 font-medium text-neutral-200 outline-none focus:border-neutral-500" 
              value={filterTopic} 
              onChange={e => setFilterTopic(e.target.value)}
            >
              <option value="">All Topics</option>
              {FIXED_TOPICS.map((topic) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
            <select 
              className="px-3 py-2 text-xs border border-neutral-800 rounded-xl bg-neutral-900 flex-1 font-medium text-neutral-200 outline-none focus:border-neutral-500" 
              value={filterDiff} 
              onChange={e => setFilterDiff(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          {filteredQuestions.length > 0 && (
            <div 
              onClick={toggleAllFiltered} 
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-neutral-900 rounded-xl border border-neutral-800 mb-3 cursor-pointer select-none hover:bg-neutral-800 transition-colors"
            >
              <input 
                type="checkbox" 
                checked={isAllFilteredSelected} 
                ref={el => { if (el) el.indeterminate = isSomeFilteredSelected; }}
                onChange={() => {}} 
                className="accent-white rounded cursor-pointer w-4 h-4" 
              />
              <span className="text-xs font-bold text-neutral-300">
                {isAllFilteredSelected 
                  ? "Deselect All Filtered Questions" 
                  : `Select All ${filteredQuestions.length} Filtered Question${filteredQuestions.length === 1 ? '' : 's'}`}
              </span>
            </div>
          )}
          
          <div className="divide-y divide-neutral-800/80 overflow-y-auto flex-1 pr-2">
            {filteredQuestions.length === 0 ? (
              <p className="text-neutral-500 text-center py-8 text-xs">No questions found matching current filter.</p>
            ) : (
              filteredQuestions.map(q => (
                <div key={q.id} className="py-4 flex gap-4 items-start hover:bg-neutral-900/40 p-2.5 rounded-xl transition-colors cursor-pointer" onClick={() => toggleQuestion(q.id)}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(q.id)}
                    onChange={() => {}} 
                    className="mt-1.5 w-4 h-4 accent-white rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">{q.category}</span>
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">{q.difficultyLevel || 'Medium'}</span>
                    </div>
                    <p className="text-sm font-medium text-neutral-200 line-clamp-2">{q.text}</p>
                    {q.imageUrl && (
                      <div className="mt-1.5">
                        <img src={q.imageUrl} alt="Diagram" className="max-h-16 rounded-lg border border-neutral-800 bg-black object-contain p-0.5" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-neutral-800">
        <button 
          type="button" 
          onClick={() => router.back()}
          className="px-6 py-2.5 font-bold text-xs text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="px-6 py-2.5 font-bold text-xs text-black bg-white hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-50 shadow-md cursor-pointer"
        >
          {loading ? "Scheduling Exam..." : "Schedule Exam"}
        </button>
      </div>
    </form>
  );
}
