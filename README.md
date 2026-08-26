<div align="center">
  <h1>Aptix Assessment Platform</h1>
  
  <p>A highly secure, robust, and scalable examination and assessment platform built for the Kinesis Technical Society (KTS).</p>
</div>

<br />

## 🌟 Overview

Aptix is a comprehensive digital assessment platform tailored for technical societies and educational institutions. It ensures absolute fairness and integrity through strict anti-cheating mechanisms, precise time synchronization, and secure content delivery, all while providing an intuitive experience for both test setters and candidates.

## 🚀 Key Features

### 🛡️ Ironclad Anti-Cheating & Security
* **Network Time Protocol (NTP) Sync**: True time tracking decoupled from local device clocks, ensuring absolute fairness across all candidates.
* **Strict Window Monitoring**: Detects and logs when a candidate leaves the exam tab or loses focus. Auto-submits the exam if the tab-switch limit is exceeded.
* **Fullscreen Enforcement**: Enforces a strict fullscreen mode during assessments. Exiting fullscreen halts the exam and requires candidate re-entry.
* **Intelligent Content Obfuscation**: Correct answers and detailed explanations are stripped from the payload sent to the candidate's browser, preventing inspection-based cheating.
* **Secure Client-Server Communication**: Immutable state transitions for exam sessions.

### 📝 Flexible Question Bank & Authoring
* **Question Adder Module**: A clean, tabbed interface for test setters to build the question bank.
* **Bulk Upload**: Import hundreds of questions instantly via CSV.
* **Intelligent Parse & Paste**: Paste raw text and let the system parse it into structured questions automatically.
* **Multiple Formats**: Supports Single Choice, Multiple Choice, True/False, Fill in the Blanks, and Numeric Entry.

### 📊 Advanced Proctoring & Live Monitoring
* **Real-time Live Monitor**: Watch candidate progress live. See who has started, who is late, and monitor live cheat signals.
* **Dynamic Time Extensions**: The exam owner can grant time extensions to specific candidates or the entire session on the fly.
* **Forced Submissions**: Safely auto-submit all active tests when the session timer expires or manually force submission for flagged candidates.

### 📈 Detailed Analytics & Reporting
* **Granular Breakdown**: Once a test is complete, candidates (if permitted) can see exactly what they answered versus the correct answers, along with detailed explanations.
* **Time-spent Tracking**: Precisely measures the exact number of seconds a candidate spends on every single question.
* **Score Normalization**: Supports negative marking, partial credit, and dynamic score calculation.

## 💻 Tech Stack

* **Framework**: Next.js 14 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS
* **Database**: SQLite (via Prisma ORM)
* **Icons & UI**: Lucide React

## 🛠️ Getting Started

### Prerequisites
* Node.js 18+
* npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yashsinghal1234/Aptix.git
   cd Aptix
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 👥 Contributors
Developed and maintained for the **Kinesis Technical Society (KTS)**.
