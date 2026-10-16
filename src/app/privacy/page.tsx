export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-neutral-200 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">APTIX · PRIVACY POLICY</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-xs text-neutral-500">Last updated: October 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold">1. What we collect</h2>
            <p className="mt-1 text-neutral-400">
              Account data (name, institutional email), exam activity (answers, scores, timing, integrity signals such as tab
              switches), and authentication data (college Google account email and verification status when you sign in with
              Google). We do not collect passwords for candidates; staff passwords are stored as one-way scrypt hashes.
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">2. Google sign-in data</h2>
            <p className="mt-1 text-neutral-400">
              When you use “Continue with college Google”, Google shares your name, email address, and verification status
              (openid, email, profile scopes only). We use this solely to prove ownership of your institutional inbox and to
              restrict exams to approved students. We do not read your emails, Drive, or Classroom data.
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">3. How we use data</h2>
            <p className="mt-1 text-neutral-400">
              To conduct and grade examinations, show results and analytics to authorized faculty, enforce exam integrity,
              and operate the platform (security logs, rate limiting). We never sell personal data or use it for advertising.
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">4. Sharing</h2>
            <p className="mt-1 text-neutral-400">
              Results are visible to your institution’s authorized examiners. Infrastructure providers (hosting, database)
              process data only to run the service. No other third-party sharing.
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">5. Retention & deletion</h2>
            <p className="mt-1 text-neutral-400">
              Exam records are retained per your institution’s academic policy. To request correction or deletion of your
              account data, contact your department administrator or the system owner who provisioned your exam.
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">6. Contact</h2>
            <p className="mt-1 text-neutral-400">For privacy questions, contact your institution’s exam administrator.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
