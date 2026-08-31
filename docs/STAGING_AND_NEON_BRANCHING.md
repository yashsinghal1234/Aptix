# Neon Database Branching & Staging Environment Guide

This document defines the zero-risk testing workflow for Aptix using **Neon Database Branching** and **Vercel Preview/Staging Deployments**.

---

## 1. Why Neon Branching?

Neon serverless Postgres allows instant, copy-on-write database branches:
- **Zero Impact on Production**: Staging attempts, mock tests, and schema migrations run in total isolation.
- **Real-Data Parity**: Staging contains an exact snapshot of question banks and template configs without modifying live candidate records.
- **Cost**: Included in Neon's free tier.

---

## 2. 1-Minute Staging Setup via Neon Dashboard

1. Open your [Neon Console](https://console.neon.tech).
2. Select your `Aptix` database project.
3. In the sidebar, click **Branches** &rarr; **New Branch**.
4. Set Branch Name: `staging`.
5. Parent Branch: `main`.
6. Copy the generated Connection String:
   ```env
   DATABASE_URL="postgresql://[user]:[password]@[staging-host].neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://[user]:[password]@[staging-host].neon.tech/neondb?sslmode=require"
   ```

---

## 3. Environment Variable Mapping

| Environment | Purpose | Database Connection |
| :--- | :--- | :--- |
| **Local Development** | Local feature authoring | Neon `staging` branch or local postgres |
| **Vercel Preview / Staging** | Full dry-run rehearsal before live exam | Neon `staging` branch |
| **Production (`main`)** | Live exam session with candidates | Neon `main` branch (`sslmode=require`) |

In your Vercel Project Settings &rarr; **Environment Variables**:
- Set `DATABASE_URL` (Production environment) &rarr; `main` branch.
- Set `DATABASE_URL` (Preview environment) &rarr; `staging` branch.

---

## 4. Pre-Exam Staging Dry Run Checklist

Run this 24 hours before any major scheduled exam:

1. **Deploy latest build to Staging Branch**.
2. **Execute Critical Path Tests**:
   ```bash
   npm test
   ```
3. **Simulate a Test Session**:
   - Create a 5-minute mock template with 10 questions in `/dashboard/owner`.
   - Launch session and generate PIN.
   - Complete assessment on desktop and mobile browser.
   - Verify scorecard, CSV export, and proctor stream in `/dashboard/owner/session/[id]`.
4. **Reset Staging Data**:
   - Delete mock sessions in Staging branch freely without touching `main`.
