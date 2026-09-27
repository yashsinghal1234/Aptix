export interface PracticeQuestion {
  id: string;
  text: string;
  type: string;
  category: string;
  difficultyLevel: string;
  points: number;
  negativePoints: number;
  imageUrl?: string | null;
  options: { text: string; explanation?: string | null; imageUrl?: string | null }[];
  correctAnswer: string;
  explanation: string;
}

export const FIXED_PRACTICE_QUESTION_IDS = [
  "cmta9kftt000254k1m41dx4z4", // Q1: Simple Interest on ₹5,000 at 8% (Quantitative Aptitude)
  "cmta9kfw2000754k19rx2mlzi", // Q2: Next number in series: 2, 6, 12, 20, 30 (Logical Reasoning)
  "cmtx9o56e0000df5zlc8atjay", // Q3: C code output while loop (Domain Specific / Computer Science)
  "cmth64giz000f893j0h0uyoff", // Q4: Blood relations - Brother, sister, father (Domain Specific)
  "cmth64gjf000g893jan62h35x", // Q5: Coding - CODING -> DPEJOH, PYTHON -> QZUIPO (Domain Specific)
  "cmtx8x5g50000nghly8hpeuip", // Q6: Translator converting high-level language -> Compiler (Computer Science)
  "cmta9kfwi000854k1ic4894wp", // Q7: Ratio of boys to girls 3:2 (Quantitative Aptitude)
  "cmthgpewn000mi3gxhqxahg59", // Q8: Loop guaranteed to execute at least once -> Do-while (Domain Specific)
  "cmthgpetz000gi3gxw4f33qij", // Q9: Volatile memory -> RAM (Domain Specific / Hardware)
  "cmth64gik000e893jqjn9t32l", // Q10: Markup 40%, discount 25% -> 5% profit (Quantitative Aptitude)
];

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    id: "cmta9kftt000254k1m41dx4z4",
    text: "What is the simple interest on ₹5,000 at 8% per annum for 2 years?",
    type: "MCQ_SINGLE",
    category: "Quantitative Aptitude",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "₹600" },
      { text: "₹700" },
      { text: "₹800" },
      { text: "₹900" }
    ],
    correctAnswer: "₹800",
    explanation: "Simple Interest formula: SI = (P × R × T) / 100\nHere, P = ₹5,000, R = 8%, T = 2 years.\nSI = (5000 × 8 × 2) / 100 = 80,000 / 100 = ₹800."
  },
  {
    id: "cmta9kfw2000754k19rx2mlzi",
    text: "What is the next number in the series: 2, 6, 12, 20, 30, ?",
    type: "MCQ_SINGLE",
    category: "Logical Reasoning",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "36" },
      { text: "40" },
      { text: "42" },
      { text: "44" }
    ],
    correctAnswer: "42",
    explanation: "Examine the step increments between consecutive numbers:\n6 - 2 = 4\n12 - 6 = 6\n20 - 12 = 8\n30 - 20 = 10\nThe difference increments by 2 each step (+4, +6, +8, +10).\nThe next difference is +12.\n30 + 12 = 42."
  },
  {
    id: "cmtx9o56e0000df5zlc8atjay",
    text: "Give the output of the following given code:\n\n#include <stdio.h>\nint main() {\n    int a = 5;\n    while(a > -2) {\n        printf(\"%d \", a);\n        a -= 3;\n    }\n    return 0;\n}",
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "EASY",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "5 2" },
      { text: "5 2 0" },
      { text: "5 2 -2" },
      { text: "5 2 -1" }
    ],
    correctAnswer: "5 2 -1",
    explanation: "Step-by-step trace of the while loop:\n1. Initially a = 5. (5 > -2 is TRUE) -> prints '5 ', a becomes 5 - 3 = 2.\n2. Iteration 2: a = 2. (2 > -2 is TRUE) -> prints '2 ', a becomes 2 - 3 = -1.\n3. Iteration 3: a = -1. (-1 > -2 is TRUE) -> prints '-1 ', a becomes -1 - 3 = -4.\n4. Iteration 4: a = -4. (-4 > -2 is FALSE) -> loop terminates.\nFinal output: '5 2 -1'."
  },
  {
    id: "cmth64giz000f893j0h0uyoff",
    text: "A is the brother of B. B is the sister of C. C is the father of D. How is A related to D?",
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "Father" },
      { text: "Grandfather" },
      { text: "Uncle" },
      { text: "Brother" }
    ],
    correctAnswer: "Uncle",
    explanation: "C is the father of D. Since A is the brother of B and B is the sister of C, A is C's brother. The brother of one's father is their paternal Uncle."
  },
  {
    id: "cmth64gjf000g893jan62h35x",
    text: 'If "CODING" is written as "DPEJOH", how is "PYTHON" written?',
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "EASY",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "QZUIPO" },
      { text: "QZUJPO" },
      { text: "PZUIPO" },
      { text: "QZTIPO" }
    ],
    correctAnswer: "QZUIPO",
    explanation: "Each letter is shifted forward by +1 position in the alphabet:\nC(+1)->D, O(+1)->P, D(+1)->E, I(+1)->J, N(+1)->O, G(+1)->H\nApplying the exact same rule to PYTHON:\nP(+1)->Q, Y(+1)->Z, T(+1)->U, H(+1)->I, O(+1)->P, N(+1)->O\nResult: QZUIPO."
  },
  {
    id: "cmtx8x5g50000nghly8hpeuip",
    text: "Which translator converts high-level language into machine/object code?",
    type: "MCQ_SINGLE",
    category: "Computer Science & Tech",
    difficultyLevel: "HARD",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "Compiler" },
      { text: "Router" },
      { text: "Loader" },
      { text: "Assembler" }
    ],
    correctAnswer: "Compiler",
    explanation: "A Compiler translates entire source code written in a high-level programming language into machine code or object code before execution. An Assembler converts assembly language, while loaders and routers perform linking/networking."
  },
  {
    id: "cmta9kfwi000854k1ic4894wp",
    text: "The ratio of boys to girls in a class is 3:2. If there are 30 boys, how many girls are there?",
    type: "MCQ_SINGLE",
    category: "Quantitative Aptitude",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "15" },
      { text: "20" },
      { text: "25" },
      { text: "30" }
    ],
    correctAnswer: "20",
    explanation: "Ratio of boys to girls = 3 : 2.\nGiven 3 units = 30 boys, so 1 unit = 30 / 3 = 10.\nNumber of girls = 2 units = 2 × 10 = 20 girls."
  },
  {
    id: "cmthgpewn000mi3gxhqxahg59",
    text: "Which loop is guaranteed to execute at least once?",
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "EASY",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "For" },
      { text: "While" },
      { text: "Do-while" },
      { text: "None" }
    ],
    correctAnswer: "Do-while",
    explanation: "A do-while loop is an exit-controlled loop: the body of the loop executes first, and the condition is evaluated at the bottom. Hence it is guaranteed to execute at least once even if the condition is false initially."
  },
  {
    id: "cmthgpetz000gi3gxw4f33qij",
    text: "Which of the following is volatile memory?",
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "EASY",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "SSD" },
      { text: "Hard Disk" },
      { text: "RAM" },
      { text: "DVD" }
    ],
    correctAnswer: "RAM",
    explanation: "RAM (Random Access Memory) is volatile memory because it requires continuous electrical power to maintain its stored data; when the system is powered off, the data is erased immediately."
  },
  {
    id: "cmth64gik000e893jqjn9t32l",
    text: "A shopkeeper marks up an item by 40% and then gives a discount of 25%. What is his overall profit or loss percentage?",
    type: "MCQ_SINGLE",
    category: "Quantitative Aptitude",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [
      { text: "5% profit" },
      { text: "5% loss" },
      { text: "10% profit" },
      { text: "15% loss" }
    ],
    correctAnswer: "5% profit",
    explanation: "Let Cost Price (CP) = ₹100.\nMarked Price (MP) = 100 + 40% = ₹140.\nDiscount of 25% on MP = 0.25 × 140 = ₹35.\nSelling Price (SP) = 140 - 35 = ₹105.\nProfit = SP - CP = 105 - 100 = ₹5 on ₹100, which equals 5% profit."
  }
];
