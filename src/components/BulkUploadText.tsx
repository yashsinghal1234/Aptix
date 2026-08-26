"use client";

import { useState } from "react";
import { extractQuestionsAction } from "@/app/actions/extract";

export function BulkUploadText() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const fd = new FormData(e.currentTarget);
    const textBlob = fd.get("textBlob") as string;

    const res = await extractQuestionsAction(textBlob);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(`Successfully extracted and drafted ${res.count} questions.`);
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h3 className="font-semibold text-slate-800 text-lg mb-4">Paste & Parse Questions</h3>
      <p className="text-sm text-slate-500 mb-4">
        Format expected: <br/>
        <code className="bg-slate-100 px-2 py-1 rounded text-xs text-indigo-600 block mt-2">
          Q: What is the capital of France?<br/>
          A) London<br/>
          B) Paris<br/>
          C) Berlin<br/>
          D) Madrid<br/>
          Answer: B
        </code>
      </p>

      {error && <div className="mb-4 text-red-600 text-sm font-medium">{error}</div>}
      {success && <div className="mb-4 text-green-600 text-sm font-medium">{success}</div>}

      <form onSubmit={handleSubmit}>
        <textarea
          name="textBlob"
          required
          rows={10}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm mb-4"
          placeholder="Paste questions here..."
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70"
        >
          {loading ? "Extracting..." : "Extract to Drafts"}
        </button>
      </form>
    </div>
  );
}
