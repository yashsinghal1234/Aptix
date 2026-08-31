import { parseTextBlobToRawItems } from "../src/app/actions/extract";

export function runCSVParserTests() {
  console.log("\n🧪 Running CSV Importer Robustness Tests...");
  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ""}`);
    }
  }

  // RFC 4180 Compliant CSV Line Parser
  function parseCSVLine(text: string): string[] {
    const p: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        p.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    p.push(cur.trim());
    return p;
  }

  // Test 1: Comma inside quoted question stem
  const line1 = '"Given x = 2, y = 3, what is x + y?",Option A,Option B,Option C,Option D,0,Quantitative,MEDIUM';
  const parsed1 = parseCSVLine(line1);
  assert("Quoted Question Stem with Internal Commas Parsed Correctly", parsed1.length === 8 && parsed1[0] === "Given x = 2, y = 3, what is x + y?");

  // Test 2: Escaped quotes inside text
  const line2 = '"Select the ""correct"" sentence",Option A,Option B,Option C,Option D,1,Verbal,EASY';
  const parsed2 = parseCSVLine(line2);
  assert("Escaped Double Quotes Handled Accurately", parsed2[0] === 'Select the "correct" sentence');

  // Test 3: Simple standard CSV row
  const line3 = 'What is the capital of France?,Paris,London,Berlin,Madrid,0,General,EASY';
  const parsed3 = parseCSVLine(line3);
  assert("Standard Unquoted CSV Line Parsed", parsed3.length === 8 && parsed3[1] === "Paris");

  // Test 4: Question with "Question 1:" on separate line before stem
  const textBlob1 = `Question 1:
A train running at speed of 60 km/hr crosses a pole in 9 seconds. What is the length of train?
A) 120 metres
B) 150 metres
C) 180 metres
D) 324 metres
Answer: B`;
  const items1 = parseTextBlobToRawItems(textBlob1);
  assert("Separated 'Question 1:' Header correctly extracts real question stem", items1.length === 1 && items1[0].stem === "A train running at speed of 60 km/hr crosses a pole in 9 seconds. What is the length of train?" && items1[0].answerIndex === 1 && items1[0].options[1] === "150 metres");

  // Test 5: Question with inline header "Question 1: What is..."
  const textBlob2 = `Question 1: What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Answer: B
Explanation: Paris has been the capital since 508 AD.`;
  const items2 = parseTextBlobToRawItems(textBlob2);
  assert("Inline 'Question 1: Stem' header stripped and explanation captured", items2.length === 1 && items2[0].stem === "What is the capital of France?" && items2[0].explanation === "Paris has been the capital since 508 AD.");

  // Test 6: Multiple inline options on single line
  const textBlob3 = `Q2. Choose the correct color:
(A) Red (B) Green (C) Blue (D) Yellow
Ans: (C)`;
  const items3 = parseTextBlobToRawItems(textBlob3);
  assert("Multiple inline options on single line parsed accurately", items3.length === 1 && items3[0].options.length === 4 && items3[0].options[2] === "Blue" && items3[0].answerIndex === 2);

  return { passed, total };
}
