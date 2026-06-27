import { COMPANY_NAME, COMPANY_EMAIL, COMPANY_ADDRESS, COMPANY_PHONE } from '@/utils/companyBrand';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto p-6 prose prose-sm md:prose-base">
      <h1>Privacy Policy</h1>
      <p><strong>{COMPANY_NAME}</strong> — Last updated: 27 June 2026</p>

      <h2>1. Who We Are</h2>
      <p>
        {COMPANY_NAME}, a member of YEDA Coffee Company Limited, operates this
        management system ("the App"). Contact: {COMPANY_EMAIL} · {COMPANY_PHONE} · {COMPANY_ADDRESS}.
      </p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, phone, role, national ID, NSSF/TIN where required for payroll.</li>
        <li><strong>Financial data:</strong> wallet balances, salary, loans, overdrafts, transactions.</li>
        <li><strong>Operational data:</strong> coffee receipts, quality assessments, inventory, attendance, GPS location during clock-in.</li>
        <li><strong>Device data:</strong> device fingerprint, IP address, browser/app version for security.</li>
        <li><strong>Biometric data:</strong> face descriptors (stored hashed) for login verification, only with consent.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To operate payroll, payments, approvals and notifications.</li>
        <li>To prevent fraud and unauthorized access (device verification, OTP, biometrics).</li>
        <li>To comply with Uganda tax (URA), NSSF, and EUDR traceability obligations.</li>
      </ul>

      <h2>4. Sharing</h2>
      <p>
        We share data only with: (a) Yo! Payments for mobile-money disbursements,
        (b) Resend for transactional email, (c) Supabase for secure data hosting,
        (d) URA/NSSF as required by law. We never sell your data.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        Financial and statutory records are kept for at least 7 years as required by Ugandan law.
        You may request deletion of non-statutory data by emailing {COMPANY_EMAIL}.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You may access, correct, or request deletion of your personal data, and withdraw biometric
        consent at any time by contacting {COMPANY_EMAIL}.
      </p>

      <h2>7. Security</h2>
      <p>
        Data is encrypted in transit (HTTPS) and at rest. Access is governed by row-level security
        and role-based permissions. Verification codes are hashed.
      </p>

      <h2>8. Children</h2>
      <p>The App is not intended for users under 18.</p>

      <h2>9. Changes</h2>
      <p>We will post any policy changes on this page and notify active users by email.</p>

      <h2>10. Contact</h2>
      <p>Questions? Email {COMPANY_EMAIL} or write to {COMPANY_ADDRESS}.</p>
    </div>
  );
}