# Aptix Live-Day Operational Runbook & Contingency Playbook

This runbook defines the protocols, live triage flows, and incident escalation procedures during a live proctored assessment window.

---

## 1. Pre-Exam Station Setup (T - 30 Minutes)

1. **Owner / Chief Proctor Station**:
   - Open **Owner Dashboard** &rarr; **Active Session Monitor** (`/dashboard/owner/session/[id]`).
   - Keep the **🛡️ Real-Time Proctoring & Integrity Stream** visible on a dedicated monitor.
   - Verify server time synchronization (`Server Time Synced: YES`).
2. **Infrastructure Health Monitor**:
   - Open **Neon Console** &rarr; **Metrics** (Monitor active connections, CPU, and latency).
   - Keep Sentry / Server Error Logs open in a browser tab.

---

## 2. Emergency Contingency Playbooks

### Scenario A: Sudden Database Connection Spike or Pool Saturation
- **Symptom**: Candidates experience >2s latency on login or autosaves.
- **Root Cause**: Uncached thundering herd queries.
- **Immediate Action**:
  1. Verify Redis caching is active via `UPSTASH_REDIS_REST_URL` in environment variables.
  2. In Neon Console &rarr; Check **Connection Pooling** (ensure pooling port `5432` / PgBouncer is used for `DATABASE_URL`).
  3. If DB is struggling, the client automatically buffers all unsaved answers locally in `localStorage` under `aptix_attempt_[id]`. **No candidate data is lost**.

---

### Scenario B: Candidate Hardware Crash, Blue Screen, or Accidental Power Loss
- **Symptom**: Candidate machine dies mid-exam.
- **Recovery Protocol (30 Seconds)**:
  1. Move candidate to any alternate working device or restart computer.
  2. Candidate navigates to Aptix portal and enters the same **Exam PIN**, **Name**, and **Email**.
  3. The platform detects the existing attempt record:
     - **Deterministic PRNG Shuffle Seed** reconstructs the exact same question order and option choices.
     - All previously submitted answers are instantly reloaded.
     - Candidate resumes immediately with zero loss of progress.
  4. If candidate lost 3-5 minutes rebooting:
     - Owner goes to **Candidate Live Monitor** in `/dashboard/owner/session/[id]`.
     - Clicks candidate row &rarr; Click **"Extend Candidate Time"** &rarr; Add **+5 Minutes**.
     - Candidate's local countdown clock automatically increments live via server sync.

---

### Scenario C: Accidental Candidate Submission Before Time Limit
- **Symptom**: Candidate clicked "Submit Assessment" prematurely.
- **Recovery Protocol**:
  1. Owner navigates to `/dashboard/owner/session/[id]`.
  2. Locate candidate in **Live Candidate Monitor** table.
  3. Click **"Reopen Attempt"** button.
  4. Attempt status transitions from `SUBMITTED` back to `IN_PROGRESS`.
  5. Candidate refreshes browser and resumes answering remaining questions.

---

### Scenario D: Campus-Wide Network Hiccup / Lab Router Glitch
- **Symptom**: Network connection lost across all candidates simultaneously.
- **Platform Resilience**:
  - Aptix candidate interface operates in offline-tolerant mode: candidates can continue selecting answers without crashing.
  - Answers queue in browser memory and local storage.
  - Once Wi-Fi reconnects, queued answers flush automatically to the server with `Cloud Synced ✓` indicator.
- **Proctor Action**:
  - Owner clicks **"Session Extension (+5m / +10m)"** in the top action bar to grant extra time to the entire batch.

---

## 3. Communication & Escalation Matrix

| Role | Person / Desk | Responsibility |
| :--- | :--- | :--- |
| **Lead Proctor / Admin** | Owner Portal Console | Live session monitor, time extension approvals, reopening accidental submissions |
| **Lab Assistants** | On-Floor | Assist students with browser zoom, hardware swaps, Wi-Fi reconnection |
| **Technical Desk** | Server & Neon Logs | Monitor connection pool, Sentry error logs, API latency |

---

## 4. Post-Exam Closure Protocol

1. **Verify All Submissions**:
   - Time Sweeper automatically sweeps any overdue attempts and updates statuses to `SUBMITTED`.
2. **Download Official Records**:
   - Click **"📥 Export Full Scorecard CSV"** for institutional archives and rank lists.
   - Click **"📥 Export Item Psychometrics CSV"** for question discrimination analysis.
