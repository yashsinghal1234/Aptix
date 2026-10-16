import { validatePasswordPolicy } from "../src/lib/password";

export function runAuthSecurityTests() {
  console.log("\n🧪 Running Auth & Security Boundary Tests...");
  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ""}`);
    }
  }

  // Pure helper simulating institutional domain checking
  function validateCandidateDomain(email: string, allowedDomain?: string | null): boolean {
    if (!allowedDomain || allowedDomain.trim() === "") return true;
    const cleanDomain = allowedDomain.trim().toLowerCase().replace(/^@/, "");
    const emailParts = email.trim().toLowerCase().split("@");
    if (emailParts.length !== 2) return false;
    const candidateDomain = emailParts[1];
    return candidateDomain === cleanDomain || candidateDomain.endsWith("." + cleanDomain);
  }

  assert("Allowed Domain null accepts any valid email", validateCandidateDomain("student@gmail.com", null));
  assert("Allowed Domain empty string accepts any valid email", validateCandidateDomain("student@gmail.com", ""));
  
  assert("Domain match exact 'kiet.edu'", validateCandidateDomain("alex@kiet.edu", "kiet.edu"));
  assert("Domain match with leading @ '@kiet.edu'", validateCandidateDomain("alex@kiet.edu", "@kiet.edu"));
  assert("Domain match subdomain 'alex@cs.kiet.edu'", validateCandidateDomain("alex@cs.kiet.edu", "kiet.edu"));
  
  assert("Reject mismatch domain 'student@gmail.com' for 'kiet.edu'", !validateCandidateDomain("student@gmail.com", "kiet.edu"));
  assert("Reject malformed email 'notanemail'", !validateCandidateDomain("notanemail", "kiet.edu"));

  // Staff Password Change Guard simulation
  function mustRedirectToPasswordSetup(user: { role: string; mustChangePassword?: boolean }): boolean {
    return (user.role === "SETTER" || user.role === "OWNER") && !!user.mustChangePassword;
  }

  assert("Setter with mustChangePassword=true redirects to setup", mustRedirectToPasswordSetup({ role: "SETTER", mustChangePassword: true }));
  assert("Setter with mustChangePassword=false proceeds to dashboard", !mustRedirectToPasswordSetup({ role: "SETTER", mustChangePassword: false }));
  assert("Candidate never redirected to admin setup", !mustRedirectToPasswordSetup({ role: "CANDIDATE", mustChangePassword: true }));

  // Robust Password Policy Tests (NIST SP 800-63B / >=8 chars, alphanumeric/symbols)
  assert("Accept strong password 'SuperSecret123!'", validatePasswordPolicy("SuperSecret123!").valid);
  assert("Accept 8-character mixed password 'Alpha890'", validatePasswordPolicy("Alpha890").valid);
  assert("Reject short password <8 chars 'Pass1'", !validatePasswordPolicy("Pass1").valid);
  assert("Reject numbers-only password '1234567890'", !validatePasswordPolicy("1234567890").valid);
  assert("Reject letters-only password 'NoNumbersHere'", !validatePasswordPolicy("NoNumbersHere").valid);
  assert("Reject empty password", !validatePasswordPolicy("").valid);

  return { passed, total };
}
