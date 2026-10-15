<div align="center">

  <img src="./public/logo.png" alt="Aptix Logo" width="100" style="border-radius: 20%;" />

  # ⚡ Aptix Assessment Platform

  **Enterprise-Grade Digital Examination, Live Proctoring & Concurrency-Resilient Assessment Engine**

  <p align="center">
    <a href="#-architecture--concurrency-design">Architecture</a> •
    <a href="#-core-capabilities">Key Features</a> •
    <a href="#-role-based-workflows">User Roles</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-environment-configuration">Configuration</a> •
    <a href="#-deployment">Deployment</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS" />
    <img src="https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" alt="Proprietary License" />
  </p>

</div>

---

## 🌟 Executive Summary

**Aptix** is a high-concurrency, zero-data-loss examination platform designed to conduct high-stakes assessments, competitive tests, and institutional evaluations at massive scale. Built with modern full-stack web standards, Aptix eliminates the notorious **thundering-herd read/write spikes** that crash conventional assessment tools when hundreds or thousands of students access tests simultaneously.

From instant offline client answer buffering and true server NTP clock synchronization to live interactive proctoring and psychometric analytics, Aptix ensures absolute fairness, total reliability, and complete operational visibility.

---

## 🚀 Key Highlights & Architecture

```mermaid
graph TD
    A[Candidate Browser] -->|Encrypted HTTPS| B[Next.js 14 App Router]
    B -->|Stateless JWT Auth| C[Middleware & Route Handlers]
    B -->|Server Actions| D[Prisma ORM Client]
    D -->|Connection Pool| E[(Neon Serverless PostgreSQL)]
    
    subgraph Client-Side Resilience
        A -->|Debounced 400ms| F[Instant LocalStorage Buffer]
        F -->|Streamed Sync| B
        A -->|NTP Calibration| G[Server-Calibrated Clock]
        A -->|Anti-Cheat Watchdog| H[Fullscreen / Tab-Switch Monitor]
    end

    subgraph Live Proctoring & Operations
        I[Owner Dashboard] -->|3s Live Feed Pulse| B
        I -->|1-Click Dynamic Control| J[Extend Time / Retake / Force End]
        I -->|Auto-Pick Rules Engine| K[Dynamic Question Assembler]
    end
```

### 1. 🛡️ High-Scale Concurrency & Zero Data Loss
* **Thundering-Herd Read Mitigation**: Pre-cached and snapshotted question set definitions eliminate database bottlenecks when 1,000+ candidates initiate tests at the exact same second.
* **Transaction-Free Raw SQL Bulk Upsert**: Candidate answer submissions use high-speed parameterized SQL (`INSERT ... ON CONFLICT DO UPDATE`), collapsing 50+ individual database round-trips into a single atomic write without transaction locks.
* **Dual-Layer Storage (IndexedDB + In-Memory)**: Non-blocking client-side IndexedDB persistence ensures zero frame drops during autosaves, with automatic retry queues when lab Wi-Fi fluctuates.
* **Dual-Layer Crash Restoration**: If a candidate experiences power failure, browser crash, or machine reboot, re-entering the exam instantly restores all previously marked answers, visited question states, and remaining time down to the exact second.
* **In-Memory TTL Multi-Tier Caching**: Dashboard statistics, active session rosters, and candidate mastery metrics leverage atomic cache layers to keep Neon query latency under 50ms.
* **$O(1)$ Deadline Sweeper & Lazy Submission**: Strict deadlines are checked at the millisecond level on candidate interactions (Check-on-Access) combined with an automated scheduled sweep.

### 2. 🔒 Ironclad Anti-Cheating & AI Proctoring
* **Server-Calibrated NTP Timekeeping**: Prevents local device clock tampering; timers run against high-precision server time delta stamps with server-side deadline capping.
* **Sliding-Window Rate Limiting**: Anti-brute-force defense throttles unauthorized PIN guesses and credential spraying on all authentication entrypoints.
* **Single-Device / Single-Tab Session Lock**: Enforces a strict lease lock per candidate session, immediately booting duplicate tabs or concurrent devices.
* **Hardware & Sandbox Detection**: Client initialization inspects WebGL unmasked hardware renderers to identify virtual machines and sandbox cheating environments (`VMware`, `VirtualBox`, `SwiftShader`, `llvmpipe`, `Parallels`).
* **Extension Injection Guardian**: `MutationObserver` monitors document body for unauthorized third-party AI extensions, floating overlays, and ChatGPT/Copilot sidebars.
* **Multi-Display & PrintScreen Defense**: Tracks secondary monitors via the Window Management API and actively purges the system clipboard upon OS-level PrintScreen keystrokes.
* **Window Minimization & Tab-Switch Limit**: Real-time detection tracks every tab switch or window blur, increments persistent security violation flags, and triggers automatic force-submission upon exceeding thresholds.
* **Fullscreen Enforced Lockdown**: Exams prompt strict full-screen enforcement; exiting logs audit warnings.
* **Payload Answer Obfuscation**: Correct choices, explanations, and author IDs are completely stripped from candidate payloads, guaranteeing zero client-side inspect-element cheating.
* **Institutional Domain Locking**: Restrict test eligibility to specific verified institutional email domains (e.g. `@college.edu`).

### 3. 📚 Question Bank Integrity & Setter Intelligence
* **Question Bank Integrity Lock**: Questions bound to active (`LIVE`) or concluded (`COMPLETED`) assessment sessions are hard-locked against accidental deletion, permanently safeguarding historical scorecards and candidate response archives.
* **Visual Lock Transparency**: Setters and administrators receive clear `🔒 Locked` status indicators and protective tooltips in the Question Bank management portal.
* **Intelligent Duplicate Stem Detection**: Token-based Jaccard similarity engine with prefix normalization (`Q1:`, `1)`, etc.) and stop-word filtering prevents question bank pollution, flagging exact duplicates and near-identical questions (>85% match).
* **Quote-Aware CSV Bulk Importer**: RFC 4180-compliant CSV parser seamlessly processes questions containing internal commas, escaped quotes, and multiline choices with automated duplicate skip reporting.
* **AI Extraction Deduplication**: The AI question extractor audits incoming batches and automatically skips existing items to prevent redundant entries.

### 4. 📊 Psychometrics & Executive Analytics
* **Cohort Mastery Metrics**: Automatic calculation of cohort mean score, median score, pass rates, and candidate decile score histograms.
* **Psychometric Item Discrimination**: Per-question analytics measure question difficulty index ($p$-value), discrimination index ($D$), and distractor frequency distributions.
* **Audit Trail & Response Inspection**: Comprehensive timeline view of every student's answer submission, flag occurrences, and time logged.

### 5. 🎮 Gamified Assessment Mode & Spirit Mascots
* **10 Interactive Spirit Mascots**: Candidates can choose from 10 pixel-art companions: Iron Man, Smooth Criminal (Michael Jackson), Madara Uchiha, Deadpool, Courage the Cowardly Dog, Spider-Man, Monkey D. Luffy, John Wick, Vader & Luke (Star Wars Lightsaber Duel), and The Contender (Boxer).
* **Widescreen 5-in-One Selector Grid**: Responsive 5-column layout with character zoom, alignment, and power-flavor bios.
* **Persistent Companion Experience**: Chosen mascot badge accompanies the student throughout the exam header and celebratory scorecard.
* **Live Session Toggle**: Instructors can enable or disable Gamified Mode anytime on any live session directly from the Command Center.

### 6. 🏆 Granular Result Release & Cohort Podium Control
* **Flexible Visibility Policies**: Support for `IMMEDIATE`, `AFTER_RELEASE`, and `NEVER` score visibility policies.
* **On-Demand Results Release**: For `AFTER_RELEASE` exams, submitted candidates view a submission confirmation until the instructor clicks **"Release Results to Candidates"** in the Live Session Monitor.
* **Animated Top-3 Podium Reveal**: Instructors control when the cohort top-3 podium snapshot is revealed to candidates, showing the top performers along with their animated mascot character avatars.
* **Teacher-Exclusive Live Podium & Leaderboard**: Dedicated real-time podium and ranked leaderboard cockpit built exclusively for instructors. Available directly during **live exam monitoring** (updating dynamically as candidates progress and submit) and preserved permanently in **historical post-exam analytics**, completely independent of candidate-facing release toggles. Includes:
  * Top-3 visual podium with dynamically scaled gold 👑, purple 🥈, and coral 🥉 pillars.
  * Animated mascot GIF character avatars with smooth focus framing and glow effects.
  * Search by candidate name, email, or mascot name, plus instant status filtering (`ALL`, `SUBMITTED`, `IN_PROGRESS`).
  * Cohort summary metrics (Highest Score, Cohort Mean, Passing Rate %) and 1-click candidate audit links.
* **Zero Data Leakage Invariant**: Strict server-side gatekeeping ensures answers, solutions, and podium snapshots are never sent over the wire until officially released.

---

## 🖥️ Platform Tour & User Roles

### 👑 Assessment Owner / Administrator
* **Full-Width Operations Hub**: Real-time view of active live assessments, candidates in progress, and cheat flags.
* **Teacher-Exclusive Live & Historical Podium Leaderboard**:
  * Real-time top-3 visual podium with animated mascot GIF avatars, score percentages, and dense-ranked cohort leaderboard.
  * Search by candidate name, email, or mascot name with multi-status filtering (`ALL`, `SUBMITTED`, `IN_PROGRESS`).
  * Available directly inside the Live Session Cockpit and preserved permanently inside the Historical Exam Results view.
* **Exam Template Management**:
  * Clean, tabular blueprint directory displaying test durations, fixed questions, auto-pick rule sets, and passing criteria.
  * **Interactive Slide-Over Drawer**: Click any template to inspect rules, question pools, and proctoring parameters.
  * **Dynamic Exam Rescheduling**: Update start dates & times for upcoming scheduled exams directly from the drawer.
  * **Inline Specification Editor**: Modify title, instructions, duration, negative marking, domain locks, and anti-cheat policies on the fly.
* **Live Monitoring Command Center**:
  * 3-second auto-sync feed showing candidate progress, submissions, and flag alerts.
  * 1-Click compensatory time grant (`🔓 +10m Extension`) or clean retake grant (`🔄 Reset Retake`).
  * Force End session control with automated evaluation generation.

### 📝 Question Setter / Faculty
* **Authoring Suite**: Supports Single Choice (MCQ), Multiple Correct, Fill in the Blanks, and Numerical Entry.
* **Dynamic Auto-Pick Rules Engine**: Formulate templates using dynamic category rules (e.g., *10 Easy Quantitative + 5 Hard Logical Reasoning*).
* **Question Quality Queue**: Review workflow for reviewing submitted items, evaluating points, and managing the central bank.

### 🎓 Candidate / Student
* **Distraction-Free Exam Interface**: Sleek dark-mode interface with a clear question palette, review tags, remaining time indicators, and quick navigation.
* **Diagnostic & Practice Interface**: Self-paced drill mode offering instant feedback, detailed step-by-step explanations, and category-level mastery tracking.
* **Candidate Performance Report**: Comprehensive breakdown of individual test scores, question-by-question review (when enabled by the owner), and cohort standing.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Next.js 14 (App Router)](https://nextjs.org/) | Server Components, Server Actions & Route Handlers |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | End-to-end type safety & strict interface modeling |
| **Database** | [Neon Serverless PostgreSQL](https://neon.tech/) | Cloud-native, high-concurrency relational data layer |
| **ORM** | [Prisma ORM](https://www.prisma.io/) | Schema modeling, connection management & migrations |
| **Styling** | [TailwindCSS 3](https://tailwindcss.com/) | Bespoke dark-mode glassmorphic design system |
| **Authentication** | [Jose](https://github.com/panva/jose) & HTTP-only Cookies | Secure, stateless JWT token management |
| **Validation** | [Zod](https://zod.dev/) | Strict runtime schema parsing for forms & API payloads |

---

## 🏁 Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or higher
- **npm** or **pnpm**
- **PostgreSQL Database** (Local instance or free cloud database like [Neon](https://neon.tech))

### 1. Clone the Repository
```bash
git clone https://github.com/yashsinghal1234/Aptix.git
cd Aptix
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Database Connection (Neon or local PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-sample-pool.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Authentication Secret
JWT_SECRET="your-super-secure-random-32-character-secret-key"

# Automated Sweeper Cron Secret (Optional for production)
CRON_SECRET="your-sweeper-cron-secret-token"

# Base Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Initialize Database Schema
Generate Prisma client artifacts and push the schema directly to your database:
```bash
npx prisma generate
npx prisma db push
```

### 5. Launch Development Server
```bash
npm run dev
```

Access the application at [**http://localhost:3000**](http://localhost:3000).

### 6. Run Critical Path Test Suite
Verify 76 platform invariants across scoring, rate limiting, anti-cheat detection, PRNG shuffling, psychometrics, data leakage prevention, and question bank deduplication:
```bash
npm test
```

---

## 🌐 Production Deployment

### Deploying on Vercel

Aptix is built to deploy natively on **Vercel** with zero custom infrastructure overhead.

1. Push your code to your GitHub repository.
2. Go to [**vercel.com/new**](https://vercel.com/new) and import the repository.
3. In **Environment Variables**, provide:
   * `DATABASE_URL` (Use Neon pooled connection string)
   * `JWT_SECRET`
   * `CRON_SECRET`
4. Deploy! Vercel will automatically build the Next.js bundle and set up edge routing.

### Automated Exam Sweeper (GitHub Actions)
The repository includes `.github/workflows/cron-sweep.yml`, which triggers `/api/cron/sweep` on a recurring cron schedule to cleanly finalize any unsubmitted attempts for exams that reached their deadline:
* Under GitHub repository **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**, add:
  * `APP_URL`: Your live domain (e.g., `https://aptix.vercel.app`)
  * `CRON_SECRET`: Your configured cron authentication token.

---

## 📁 Project Directory Structure

```plaintext
aptix/
├── prisma/
│   └── schema.prisma            # Database models & relationships
├── public/                      # Static assets, branding & icons
├── src/
│   ├── app/                     # Next.js App Router routes & pages
│   │   ├── actions/             # Secure Server Actions (template, session, candidate)
│   │   ├── api/                 # REST endpoints & background cron workers
│   │   ├── dashboard/           # Owner, Setter & Candidate dashboards
│   │   ├── exam/                # Live proctored examination interface
│   │   └── practice/            # Diagnostic practice & drill portal
│   ├── components/              # Modular UI components & design system
│   │   ├── OwnerTemplatesManager.tsx # Interactive templates table & slide-over drawer
│   │   ├── ActiveSessionsList.tsx    # Live proctoring monitor card
│   │   ├── LaunchSessionForm.tsx     # Session scheduling & PIN generator
│   │   └── ...
│   └── lib/                     # Prisma client, JWT authentication & utilities
├── .env.example                 # Environment variables template
└── README.md                    # Project documentation
```

---

## 🤝 Contributing

Contributions, feedback, and issue reports are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 Copyright & Legal Notice

Copyright © 2024–2026 **Yash Singhal**. All Rights Reserved.

This software, along with all associated source code, user interface designs, algorithms, branding, and documentation, is **strictly proprietary**. 

* **No Unauthorized Copying or Use**: No individual or organization is permitted to duplicate, modify, distribute, publish, reverse-engineer, or commercially deploy any part of this repository without prior explicit written authorization from **Yash Singhal**.
* For licensing inquiries or formal authorization, contact: [singhalyash307@gmail.com](mailto:singhalyash307@gmail.com).
