"use client";

import { useState } from "react";
import { createQuestionAction } from "@/app/actions/setter";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ""));
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ""));
  return result;
}

export function BulkUploadCSV() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split("\n").map(row => row.trim()).filter(row => row.length > 0);
        
        let successCount = 0;
        let duplicateCount = 0;

        // Skip header row if it exists
        const startIndex = rows[0].toLowerCase().includes("question") ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const cols = parseCSVLine(rows[i]);
          if (cols.length >= 7) {
            const formData = new FormData();
            formData.append("text", cols[0]);
            formData.append("option0", cols[1]);
            formData.append("option1", cols[2]);
            formData.append("option2", cols[3]);
            formData.append("option3", cols[4]);
            
            let correctIndex = parseInt(cols[5]);
            if (isNaN(correctIndex)) {
              if (cols[5].includes("1") || cols[5].toLowerCase() === "a") correctIndex = 0;
              else if (cols[5].includes("2") || cols[5].toLowerCase() === "b") correctIndex = 1;
              else if (cols[5].includes("3") || cols[5].toLowerCase() === "c") correctIndex = 2;
              else if (cols[5].includes("4") || cols[5].toLowerCase() === "d") correctIndex = 3;
              else correctIndex = 0;
            }

            formData.append("correctAnswer", correctIndex.toString());
            formData.append("category", cols[6]);

            const res = await createQuestionAction(formData);
            if (res.success) {
              successCount++;
            } else if (res.error && res.error.toLowerCase().includes("duplicate")) {
              duplicateCount++;
            }
          }
        }
        
        if (successCount === 0 && duplicateCount > 0) {
          setResult(`All ${duplicateCount} questions in this file already exist in the question bank.`);
        } else {
          setResult(`Successfully imported ${successCount} questions!${duplicateCount > 0 ? ` (${duplicateCount} duplicate questions skipped)` : ""}`);
        }
      } catch (err) {
        setResult("Failed to parse CSV.");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#0a0c10] p-6 sm:p-7 rounded-3xl border border-neutral-800 shadow-2xl">
      <h3 className="font-extrabold text-white text-lg mb-2">Bulk Upload (CSV)</h3>
      <p className="text-xs text-neutral-400 mb-4">
        Upload a CSV file with columns: <br/>
        <code className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded-lg inline-block mt-1 font-mono">
          Question, Opt 1, Opt 2, Opt 3, Opt 4, Correct (0-3), Category
        </code>
      </p>
      
      <div className="relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={loading}
          className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white file:text-black hover:file:bg-neutral-200 disabled:opacity-50 cursor-pointer"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      
      {result && (
        <div className={`mt-4 text-xs font-bold p-3 rounded-xl border ${result.includes("Success") ? "text-emerald-300 bg-emerald-950/40 border-emerald-800/60" : "text-rose-300 bg-rose-950/40 border-rose-800/60"}`}>
          {result}
        </div>
      )}
    </div>
  );
}
