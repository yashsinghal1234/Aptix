"use client";

import { useState } from "react";
import { createQuestionAction } from "@/app/actions/setter";

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
        // Basic CSV split, ignores quotes handling for simplicity
        const rows = text.split("\n").map(row => row.trim()).filter(row => row.length > 0);
        
        let successCount = 0;

        // Skip header row if it exists (check if first row has 'Question Text' or similar)
        const startIndex = rows[0].toLowerCase().includes("question") ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const cols = rows[i].split(",").map(c => c.trim());
          if (cols.length >= 7) {
            const formData = new FormData();
            formData.append("text", cols[0]);
            formData.append("option0", cols[1]);
            formData.append("option1", cols[2]);
            formData.append("option2", cols[3]);
            formData.append("option3", cols[4]);
            
            // Handle if they passed text like "Option 1" instead of "0"
            let correctIndex = parseInt(cols[5]);
            if (isNaN(correctIndex)) {
              if (cols[5].includes("1") || cols[5].toLowerCase() === "a") correctIndex = 0;
              else if (cols[5].includes("2") || cols[5].toLowerCase() === "b") correctIndex = 1;
              else if (cols[5].includes("3") || cols[5].toLowerCase() === "c") correctIndex = 2;
              else if (cols[5].includes("4") || cols[5].toLowerCase() === "d") correctIndex = 3;
              else correctIndex = 0; // fallback
            }

            formData.append("correctAnswer", correctIndex.toString());
            formData.append("category", cols[6]);

            const res = await createQuestionAction(formData);
            if (res.success) {
              successCount++;
            }
          }
        }
        
        setResult(`Successfully imported ${successCount} questions!`);
      } catch (err) {
        setResult("Failed to parse CSV.");
      } finally {
        setLoading(false);
        // Reset file input
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h3 className="font-semibold text-slate-800 text-lg mb-2">Bulk Upload (CSV)</h3>
      <p className="text-sm text-slate-500 mb-4">
        Upload a CSV file with columns: <br/>
        <code className="text-xs bg-slate-100 p-1 rounded">Question, Opt 1, Opt 2, Opt 3, Opt 4, Correct (0-3), Category</code>
      </p>
      
      <div className="relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={loading}
          className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 cursor-pointer"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      
      {result && (
        <div className={`mt-3 text-sm font-medium ${result.includes("Success") ? "text-green-600" : "text-red-600"}`}>
          {result}
        </div>
      )}
    </div>
  );
}
