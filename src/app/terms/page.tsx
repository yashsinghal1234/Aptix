export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-neutral-200 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">APTIX · TERMS OF SERVICE</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-xs text-neutral-500">Last updated: October 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold">1. Acceptable use</h2>
            <p className="mt-1 text-neutral-400">
              Aptix is provided to enrolled candidates and authorized staff of the institution for conducting examinations.
              You must use your own institutional account, sit only exams you are approved for, and follow proctoring rules
              (fullscreen, no tab switching beyond limits, no impersonation).
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">2. Academic integrity</h2>
            <p className="mt-1 text-neutral-400">
              Impersonation, sharing PINs, or circumventing proctoring controls may lead to blocked sessions, invalidated
              submissions, and disciplinary action by your institution. Integrity signals are recorded for faculty review.
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">3. Accounts</h2>
            <p className="mt-1 text-neutral-400">
              Candidates authenticate with their college Google account plus an exam PIN and, where configured, an approved
              student list. Staff accounts are provisioned by the exam owner. You are responsible for keeping credentials
              confidential.
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">4. Availability</h2>
            <p className="mt-1 text-neutral-400">
              The service is provided “as is” for academic assessments. Scheduled maintenance or outages may occur; exams
              autosave progress to minimize data loss.
            </p>
          </section>
          <section>
            <h2 className="text-white font-bold">5. Contact</h2>
            <p className="mt-1 text-neutral-400">For support, contact your institution’s exam administrator.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
