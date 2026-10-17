<div align="center">

  <img src="./public/logo.png" alt="Aptix Logo" width="120" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.35);" />

  # ⚡ Aptix Assessment Platform

  **Enterprise-Grade Digital Examination, Live Proctoring & Concurrency-Resilient Assessment Engine**

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-14.2.35-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Upstash-Redis_RateLimiting-00E599?style=for-the-badge&logo=redis&logoColor=white" alt="Upstash Redis" />
    <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
    <img src="https://img.shields.io/badge/Tests-105%20%2F%20105%20Passing-brightgreen?style=for-the-badge&logo=jest&logoColor=white" alt="Tests" />
  </p>

</div>

---

## 🌟 Executive Overview

**Aptix** is a high-concurrency, zero-data-loss examination platform engineered for high-stakes university assessments, competitive tests, and institutional certifications. 

Traditional evaluation platforms suffer severe failure points under real-world pressure:
1. **Thundering-Herd Bottlenecks**: Thousands of candidates opening an exam simultaneously overload database connection pools and crash servers.
2. **Local Timer Tampering & Desync**: Client-side countdowns drift, get throttled in background tabs, or get hacked through system clock changes.
3. **Flaky Network Data Loss**: Intermittent campus Wi-Fi causes unsubmitted questions, lost keystrokes, and corrupted attempts.
4. **Subtle E-Cheating**: Virtual machine sandboxes, floating browser extensions (ChatGPT/Copilot), multi-monitor setups, and clipboard scraping bypass basic web forms.

**Aptix solves every one of these failure modes natively** with a server-authoritative state engine, transaction-free batch SQL upserts, client-side dual-storage buffers, hardware-level proctoring heuristics, and distributed sliding-window rate limiters.

---

## 🏗️ Architecture & Concurrency Flow

```mermaid
flowchart TB
    subgraph Client["Candidate Web Browser"]
        UI["React 18 Dark-Mode Interface"]
        IDB["IndexedDB + LocalStorage Buffer"]
        NTP["Server NTP Calibrator"]
        Watchdogs["Anti-Cheat Watchdogs<br/>(WebGL GPU • DOM Observer • Window API)"]
        
        UI -->|Debounced 400ms| IDB
        UI --> NTP
        UI --> Watchdogs
    end

    subgraph Edge["Edge & Security Perimeter"]
        CSP["Strict Content Security Policy (CSP)"]
        RL["Upstash Redis Sliding-Window Rate Limiter"]
        Auth["Stateless JWT + scrypt Auth + TokenVersion"]
    end

    subgraph Backend["Next.js 14 App Router (Server Actions & API)"]
        SA["Server Action RPCs<br/>(saveDraftAction • submitExamAction)"]
        Deadline["Server-Authoritative Deadline Engine<br/>(0s Draft Grace • 60s Submit Grace)"]
        Cron["Automated Sweeper Worker<br/>(/api/cron/sweep • Bearer Guarded)"]
    end

    subgraph Data["Persistence & Caching Layer"]
        Prisma["Prisma ORM Client"]
        Neon[("Neon Serverless PostgreSQL<br/>Connection Pooler")]
        RedisCache[("Upstash Redis KV")]
    end

    Client -->|HTTPS / WSS| Edge
    Edge --> Backend
    SA --> Deadline
    Deadline --> Prisma
    Cron --> Prisma
    Prisma --> Neon
    RL --> RedisCache
```

---

## 🛡️ Core Capabilities & Deep Dives

### 1. ⚡ High-Scale Concurrency & Zero Data Loss
* **Thundering-Herd Read Mitigation**: Pre-cached and snapshot-assembled question sets prevent database connection exhaustion when 1,000+ candidates initiate tests at the exact same second.
* **Transaction-Free Raw SQL Bulk Upserts**: Candidate answer submissions use high-speed parameterized SQL (`INSERT ... ON CONFLICT DO UPDATE`), collapsing 50+ individual database round-trips into a single atomic write without transaction locks.
* **Dual-Layer Storage (IndexedDB + In-Memory)**: Non-blocking client-side IndexedDB persistence ensures zero frame drops during autosaves, with automatic retry queues when lab Wi-Fi fluctuates.
* **Dual-Layer Crash Restoration**: If a candidate experiences a power outage, browser crash, or machine restart, re-entering the exam instantly restores all previously marked answers, review flags, and remaining time down to the exact second.
* **Deterministic PRNG Question Shuffling**: Seeded pseudo-random shuffling guarantees that every student receives uniquely randomized questions and answer choices while remaining 100% deterministic and recoverable across restarts.

---

### 2. ⏱️ Server-Authoritative Deadline Engine (Moodle / Canvas Standard)
* **Single Source of Truth**: The server computes `effectiveEnd` on every single mutation:
  $$\text{effectiveEnd} = \text{attempt.extendedUntil} \mathbin{\Vert} \text{session.extendedUntil} \mathbin{\Vert} (\text{session.startTime} + \text{duration})$$
* **Display-Only Client Timer**: The client countdown is calibrated against server NTP time delta stamps upon initial load and re-synchronized instantly on window `visibilitychange` (foreground return).
* **Unified Grace Window Policy**:
  * **Draft Saves**: `0s grace` (strictly rejected past `effectiveEnd`).
  * **Exam Submissions**: `60s submit-only grace` to accommodate network latency. Hard rejection thereafter.
* **Instant Input Freezing**: As soon as countdown reaches `00:00`, candidate radio buttons, input fields, clear actions, and debounced buffers are frozen immediately.

---

### 3. 🔒 Ironclad Anti-Cheating & AI Proctoring
* **WebGL GPU Fingerprinting**: Client inspection probes unmasked hardware renderers to identify virtual machines and sandbox cheating environments (`VMware`, `VirtualBox`, `SwiftShader`, `llvmpipe`, `Parallels`).
* **Extension Injection Guardian**: A persistent `MutationObserver` monitors the DOM tree for unauthorized floating AI helper extensions, injected buttons, or ChatGPT/Copilot sidebars.
* **Multi-Display & PrintScreen Defense**: Uses the Window Management API to detect multi-monitor configurations and actively purges the OS-level system clipboard upon PrintScreen keystrokes.
* **Window Minimization & Tab-Switch Tracking**: Tracks window blur events, increments persistent security violation counters, and triggers automated submission when configured violation thresholds are breached.
* **Zero Client-Side Solution Leaks**: Answer keys, author metadata, and explanations are completely stripped from candidate payloads at the server boundary, preventing DevTools element-inspect exploits.
* **Institutional Domain Locking**: Restricts candidate exam entry to verified institutional email domains (e.g., `@college.edu` or `@univ.ac.in`).

---

### 4. 🔑 Enterprise Security & Distributed Rate Limiting
* **NIST-Compliant Cryptography**: Password hashing powered by `@noble/hashes/scrypt` with constant-time verification. Zero legacy MD5/SHA1 or plaintext passwords.
* **Instant Session Revocation**: Every user account maintains a `tokenVersion` counter. Revoking a session or changing credentials immediately invalidates all active JWT tokens globally.
* **Distributed Sliding-Window Rate Limiting**: Backed by **Upstash Redis**, authentication entrypoints enforce sliding-window rate limiting to neutralize brute-force attacks and PIN enumeration.
* **Strict Content Security Policy (CSP)**: Nonce-based script execution, whitelisted Google Fonts and Upstash endpoints, and `frame-ancestors 'none'` to block clickjacking.

---

## 🎮 Gamified Mode & Spirit Mascots

To boost candidate engagement and reduce test anxiety, Aptix includes an optional **Gamified Assessment Mode**. Candidates can select from 10 animated pixel-art spirit companions who accompany them on their test journey, react to milestones, and stand atop the cohort podium!

<div align="center">

| Iron Man | Smooth Criminal | Madara Uchiha | Deadpool | Courage Dog |
| :---: | :---: | :---: | :---: | :---: |
| <img src="./public/characters/ironman.gif" width="75" height="75" /> | <img src="./public/characters/michael_jackson.gif" width="75" height="75" /> | <img src="./public/characters/madara.gif" width="75" height="75" /> | <img src="./public/characters/deadpool.gif" width="75" height="75" /> | <img src="./public/characters/courage.gif" width="75" height="75" /> |
| **Spider-Man** | **Luffy (Gear 5)** | **John Wick** | **Vader vs. Luke** | **The Contender** |
| <img src="./public/characters/spiderman.gif" width="75" height="75" /> | <img src="./public/characters/luffy.gif" width="75" height="75" /> | <img src="./public/characters/john_wick.gif" width="75" height="75" /> | <img src="./public/characters/vader.gif" width="75" height="75" /> | <img src="./public/characters/boxer.gif" width="75" height="75" /> |

</div>

* **5-Column Mascot Picker**: Interactive widescreen modal with animated GIFs, character bios, and motivational mottos.
* **Live Session Toggle**: Instructors can activate or deactivate Gamified Mode per exam session with a single click.
* **Dynamic Podium**: Upon score release, the top-3 performers are showcased on an animated 3D podium with their chosen companions.

---

## 🏆 Dynamic Podium & Granular Result Release

Aptix gives instructors full operational command over when and how assessment outcomes are published:

```
Result Visibility Policies:
├── IMMEDIATE       → Candidates see score & explanations immediately upon submission.
├── AFTER_RELEASE   → Candidates see a confirmed submission screen until instructor releases scores.
└── NEVER           → Scores are held indefinitely for confidential institutional grading.
```

* **Instructor Live Podium**: Dedicated real-time cockpit updating dynamically as students submit, displaying highest score, cohort average, passing percentages, and mascot avatars.
* **Zero Data Leakage Invariant**: When an exam is configured with `AFTER_RELEASE` or `NEVER`, answer keys, item reviews, and podium rosters are physically omitted from API responses until the instructor clicks **"Release Results"**.

---

## 📚 Question Bank & Setter Intelligence

* **Session Immutability Lock**: Questions tied to live or completed sessions are locked against modification or deletion to preserve historical score accuracy.
* **Token-Based Jaccard Similarity Engine**: Scans incoming questions against the bank, normalizing prefixes (`Q1:`, `1)`) and stopwords, flagging duplicates with $>85\%$ stem similarity.
* **RFC 4180 Quote-Aware CSV Importer**: Seamlessly imports complex questions containing multiline stems, commas inside quotes, LaTeX formulas, and explanations.
* **Psychometric Item Discrimination**: Automatically calculates item difficulty ($p$-value), point-biserial discrimination index ($D$), and distractor distribution frequency for every question.

---

## 🖥️ Platform Roles & Cockpits

| Role | Key Capabilities |
| :--- | :--- |
| **👑 Assessment Owner (Admin)** | • Full operations command center with live active candidate counts.<br/>• 3-second live monitoring pulse with 1-click time extensions (`+10m`) and clean retakes.<br/>• Four-eyes moderation controls and template approval workflows.<br/>• Master analytics, cohort score histograms, and CSV data export. |
| **📝 Question Setter (Faculty)** | • Rich authoring suite for MCQ, Multi-Select, Fill-in-the-Blank, and Numeric questions.<br/>• Dynamic Auto-Pick rule builder (*e.g., 20 Easy Math + 10 Hard Logic*).<br/>• Quality queue review and duplicate stem detector. |
| **🎓 Candidate (Student)** | • High-speed dark-mode exam interface with palette navigation and review markers.<br/>• One-tap Google SSO with instant account switcher and PIN modal.<br/>• Diagnostic self-practice drill mode with instant step-by-step explanations.<br/>• Individual scorecard with detailed performance analytics. |

---

## 🧪 Invariants & Test Suite (105 / 105 Passed)

Aptix incorporates an automated critical-path invariant testing harness (`npm test`) that rigorously validates all core platform guarantees before deployment:

```bash
> aptix@0.1.0 test
> npx -y tsx tests/run-all.ts

==================================================
🚀 APTIX PLATFORM CRITICAL PATH TEST SUITE
==================================================

  Scoring Logic (MCQ, Negative, Numeric, Multi-Correct, Fill-Blank)  --> 13 / 13 PASSED
  Attempt Expiry & Server Deadline Invariants                         --> 18 / 18 PASSED
  Auth & Security Boundaries (Domains, Passwords, Scrypt, Roles)      --> 16 / 16 PASSED
  Item Psychometrics & Discrimination Index ($p$, $D$)                -->  7 /  7 PASSED
  Deterministic PRNG Shuffle & Crash Recovery                         -->  3 /  3 PASSED
  Anti-Leakage Data Sanitization & Result Release Gates               --> 16 / 16 PASSED
  RFC 4180 CSV Importer Robustness                                    -->  6 /  6 PASSED
  Upstash Rate Limiting & Safe IP Extraction                          --> 12 / 12 PASSED
  Sandbox & Virtual Machine Detection Heuristics                      -->  2 /  2 PASSED
  Question Bank Deduplication (Jaccard Similarity)                    -->  8 /  8 PASSED
  Session Roster Parser & Sanitization                                -->  4 /  4 PASSED

==================================================
📊 TEST SUITE RESULTS: 105 / 105 PASSED (100%)
🎉 ALL HIGH-STAKES PLATFORM INVARIANTS VERIFIED!
==================================================
```

---

## 🛠️ Technology Stack

| Layer | Technology | Key Selection Rationale |
| :--- | :--- | :--- |
| **Framework** | [Next.js 14 (App Router)](https://nextjs.org/) | Hybrid Server Components, Server Actions & optimized Edge routes |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | End-to-end type safety with strict compiler flags |
| **Database** | [Neon Serverless PostgreSQL](https://neon.tech/) | Cloud-native relational database with connection pooling |
| **Rate Limiter** | [Upstash Redis](https://upstash.com/) | Low-latency sliding-window distributed rate limiting |
| **ORM** | [Prisma ORM](https://www.prisma.io/) | Declarative schema modeling, migrations, and parameterized SQL |
| **Styling** | [TailwindCSS 3](https://tailwindcss.com/) | Custom responsive dark glassmorphic design system |
| **Security** | [Jose](https://github.com/panva/jose) & [@noble/hashes](https://github.com/paulmillr/noble-hashes) | Stateless JWT tokens and NIST-compliant scrypt key derivation |
| **Validation** | [Zod](https://zod.dev/) | Strict runtime schema validation across forms, RPCs, and APIs |

---

## 🏁 Quickstart & Local Setup

### Prerequisites
* **Node.js**: `v18.17.0` or higher
* **npm** or **pnpm**
* **PostgreSQL Database** (e.g., [Neon Serverless](https://neon.tech))
* **Upstash Redis Instance** (Free tier from [Upstash](https://upstash.com))

### 1. Clone & Install
```bash
git clone https://github.com/yashsinghal1234/Aptix.git
cd Aptix
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Database (Neon Serverless PostgreSQL connection with pooling)
DATABASE_URL="postgresql://user:pass@ep-sample-pool.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Stateless JWT Authentication Secret (min 32 characters)
JWT_SECRET="your-super-secure-random-32-character-secret-key"

# Upstash Redis (For distributed rate limiting)
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-rest-token"

# Automated Sweeper Cron Secret (Guards /api/cron/sweep)
CRON_SECRET="your-sweeper-cron-secret-token"

# Base Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Schema Setup
```bash
# Generate Prisma Client & apply database schema
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [**http://localhost:3000**](http://localhost:3000) in your browser.

### 5. Run Verification Suite
```bash
npm test
```

---

## 🌐 Deployment

### Deploying to Vercel
Aptix is optimized for zero-configuration deployment on **Vercel**:
1. Push your code to GitHub.
2. Import your repository into [Vercel](https://vercel.com/new).
3. Configure the environment variables (`DATABASE_URL`, `JWT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`).
4. Click **Deploy**.

### Automated Sweeper (Cron Schedule)
Aptix includes an automated exam deadline sweeper at `/api/cron/sweep` that marks overdue attempts as submitted.
* **Vercel Cron**: Configured via `vercel.json` to trigger every minute.
* **GitHub Actions**: Configured via `.github/workflows/cron-sweep.yml` as a high-availability fallback. Set `APP_URL` and `CRON_SECRET` in your repository secrets.

---

## 📁 Directory Structure

```plaintext
aptix/
├── .github/workflows/          # Automated cron sweeper GitHub Actions workflow
├── prisma/
│   └── schema.prisma           # Relational schema (Users, Sessions, Attempts, Questions)
├── public/                     # Static media, icons, and animated mascot GIFs
│   ├── characters/             # 10 animated pixel-art spirit mascots
│   └── logo.png                # Brand identity
├── src/
│   ├── app/
│   │   ├── actions/            # Server Actions (exam.ts, session.ts, template.ts, etc.)
│   │   ├── api/                # REST endpoints (/api/auth, /api/cron/sweep)
│   │   ├── dashboard/          # Owner, Setter, and Candidate operational views
│   │   ├── exam/               # Real-time proctored test environment
│   │   └── practice/           # Diagnostic drill & self-evaluation portal
│   ├── components/             # Reusable UI components & modals
│   └── lib/                    # Security, auth, redis, db client, and utilities
├── tests/                      # 105 automated critical invariant test suites
├── .env.example                # Example environment configuration
└── README.md                   # Platform documentation
```

---

## 📄 Copyright & Legal Notice

Copyright © 2024–2026 **Yash Singhal**. All Rights Reserved.

This software, including all source code, algorithms, user interface designs, visual assets, and documentation, is **strictly proprietary**. 

* **No Unauthorized Use**: Duplication, modification, redistribution, reverse engineering, or commercial use without prior explicit written permission from **Yash Singhal** is strictly prohibited.
* For licensing inquiries, institutional partnerships, or authorizations, please contact: **[singhalyash307@gmail.com](mailto:singhalyash307@gmail.com)**.
