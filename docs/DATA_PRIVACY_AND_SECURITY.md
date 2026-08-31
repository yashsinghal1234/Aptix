# Student Data Privacy, Protection & Encryption Standards

This document specifies the data handling, security architecture, and privacy guarantees implemented across the Aptix assessment platform.

---

## 1. Information Collected & Educational Justification

| Data Element | Purpose | Storage Layer |
| :--- | :--- | :--- |
| **Candidate Name** | Displayed on proctor monitor, individual scorecards, and exported rank lists | Postgres (`User` table) |
| **Institutional Email** | Authentication & domain restriction enforcement | Postgres (`User` table, indexed) |
| **Exam Responses & Answers** | Automated grading, performance diagnostics, and psychometric evaluation | Postgres (`CandidateResponse` table) |
| **Integrity Flags** | Proctored integrity audit (fullscreen exits, tab blurs, devtool opens) | Postgres (`CheatFlag` table) |

> **Note**: Aptix **does not** collect personal phone numbers, biometric raw video feeds, or payment details.

---

## 2. In-Transit & At-Rest Encryption

1. **Transport Layer Security (TLS 1.3 / SSL)**:
   - All client-to-server traffic is strictly encrypted via HTTPS / TLS.
   - Database connections to Neon Serverless Postgres are configured with `sslmode=require` enforcement:
     ```env
     DATABASE_URL="postgresql://...?sslmode=require"
     ```
2. **Confidential Staff Credentials**:
   - Question Author and Examiner passwords are encrypted and hashed with salt.
   - Staff are forced to reset default credentials upon initial login (`mustChangePassword: true`).

---

## 3. Data Retention & Archival

1. **Active Exam Window**:
   - Responses are replicated to Postgres and buffered in client local storage to protect against device failure.
2. **Post-Assessment Archival**:
   - Results can be exported via CSV and stored in official institutional records.
   - Obsolete attempts can be wiped or soft-deleted from the Owner Console without affecting historical psychometric benchmarks.
