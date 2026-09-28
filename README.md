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
* **Progressive Debounced Autosave**: Candidate selections stream automatically to PostgreSQL on a debounced timeline, backed by an immediate `localStorage` buffer for 100% offline recovery.
* **Dual-Layer Crash Restoration**: If a candidate experiences power failure, browser crash, or machine reboot, re-entering the exam instantly restores all previously marked answers, visited question states, and remaining time down to the exact second.
* **$O(1)$ Deadline Sweeper & Lazy Submission**: Strict deadlines are checked at the millisecond level on candidate interactions (Check-on-Access) combined with an automated scheduled sweep.

### 2. 🔒 Ironclad Anti-Cheating & AI Proctoring
* **Server-Calibrated NTP Timekeeping**: Prevents local device clock tampering; timers run against high-precision server time delta stamps.
* **Window Minimization & Tab-Switch Limit**: Real-time detection tracks every tab switch or window blur, increments persistent security violation flags, and triggers automatic force-submission upon exceeding thresholds.
* **Fullscreen Enforced Lockdown**: Exams prompt strict full-screen enforcement; exiting logs audit warnings.
* **Payload Answer Obfuscation**: Correct choices and explanations are completely stripped from client payloads, guaranteeing zero client-side inspect-element cheating.
* **Institutional Domain Locking**: Restrict test eligibility to specific verified institutional email domains (e.g. `@college.edu`).

### 3. 📊 Psychometrics & Executive Analytics
* **Cohort Mastery Metrics**: Automatic calculation of cohort mean score, median score, pass rates, and candidate decile score histograms.
* **Psychometric Item Discrimination**: Per-question analytics measure question difficulty index, average time spent per question, and distractor efficiency.
* **Audit Trail & Response Inspection**: Comprehensive timeline view of every student's answer submission, flag occurrences, and time logged.

---

## 🖥️ Platform Tour & User Roles

### 👑 Assessment Owner / Administrator
* **Full-Width Operations Hub**: Real-time view of active live assessments, candidates in progress, and cheat flags.
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
