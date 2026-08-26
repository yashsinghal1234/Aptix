<div align="center">
  <h1>Aptix Assessment Platform</h1>
  
  <p>A highly secure, robust, and scalable examination and assessment platform built for high-concurrency testing.</p>
</div>

<br />

## 🌟 Overview

Aptix is a high-scale digital assessment platform engineered for absolute fairness, zero-data-loss crash recovery, and resilience against sudden traffic spikes (500–1000+ concurrent students). It features an in-memory question cache layer, debounced progressive autosave, dual-layer crash state restoration, and serverless-native deadline enforcement.

---

## 🚀 Key Features

### 🛡️ High-Scale Concurrency & Serverless Architecture
* **Start-Spike Mitigation**: In-memory question set caching eliminates the thundering herd read spike when 1,000 students start simultaneously.
* **Progressive Autosave**: Client answers are debounced and streamed to the database in real time with an instant `localStorage` offline buffer.
* **Zero-Data-Loss Crash Recovery**: If a student's machine shuts down or disconnects, reopening the assessment automatically restores all answers, question visit status, and active question position without losing time.
* **$O(1)$ Deadline Sweeper & Lazy Auto-Submit**: Auto-submit is enforced on every student interaction (Check-on-Access) and backed by an automated GitHub Actions cron sweeper.
* **1-Click Test Reopening**: The test owner can grant compensatory time (`🔓 Reopen (+10m)`) or grant a clean slate (`🔄 Reset Retake`) on the fly.

### 🔒 Ironclad Anti-Cheating & Proctoring
* **Network Time Protocol (NTP) Sync**: True time tracking calibrated against server time, preventing local clock tampering.
* **Strict Window & Tab Monitoring**: Detects when candidates switch tabs or minimize the window. Enforces auto-submit upon reaching the max tab-switch limit.
* **Fullscreen Lockdown**: Enforces fullscreen mode with security violation logging.
* **Payload Answer Obfuscation**: Correct answers and explanations are stripped from client payloads until official submission.

### 📝 Flexible Question Bank & Authoring
* **Structured Question Authoring**: Single Choice, Multiple Choice, True/False, Fill in the Blanks, and Numeric Entry with configurable tolerances.
* **Bulk Upload**: Import questions via CSV or structured text.
* **AI Quality Check**: Runs prompt-guided taxonomic validation on topic tags, options, and explanations.

---

## 🛠️ Deployment on Vercel (100% Free Stack)

Aptix is designed to run natively on **Vercel's Serverless Platform** coupled with **Neon Serverless PostgreSQL**.

### 1. Database Setup (Neon PostgreSQL)
1. Create a free PostgreSQL database at [**Neon.tech**](https://neon.tech).
2. Copy your pooled connection string:
   ```env
   DATABASE_URL="postgres://user:password@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

### 2. Vercel Deployment
1. Go to [**vercel.com/new**](https://vercel.com/new) and import your repository (`yashsinghal1234/Aptix`).
2. Add the following **Environment Variables**:
   - `DATABASE_URL`: Your Neon Postgres connection string.
   - `JWT_SECRET`: Any secure random 32+ character string.
   - `CRON_SECRET`: A secret token used to authenticate the backup sweeper.
3. Click **Deploy**.

### 3. Automated Backup Sweeper (GitHub Actions)
The repository includes a free scheduled workflow (`.github/workflows/cron-sweep.yml`) that automatically pings your deployment's `/api/cron/sweep` endpoint to finalize any offline or abandoned exams.

To activate the workflow:
1. Go to your GitHub repository **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Add the following Repository Secrets:
   - `APP_URL`: Your live Vercel URL (e.g. `https://aptix.vercel.app`)
   - `CRON_SECRET`: The same secret token set in your Vercel environment variables.

---

## 💻 Local Development

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

5. Open [http://localhost:3000](http://localhost:3000) in your browser.
