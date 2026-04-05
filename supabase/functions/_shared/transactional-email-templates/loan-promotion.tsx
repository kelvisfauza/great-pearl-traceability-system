import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface LoanPromotionProps {
  employeeName?: string
  maxLoanAmount?: number
  tenureMonths?: number
  salary?: number
  multiplier?: string
  interestRate?: number
  maxRepaymentMonths?: number
  loginUrl?: string
}

const LoanPromotionEmail = ({
  employeeName = 'Team Member',
  maxLoanAmount = 0,
  tenureMonths = 0,
  salary = 0,
  multiplier = '1x',
  interestRate = 10,
  maxRepaymentMonths = 6,
  loginUrl = 'https://www.greatagrocoffeesystem.site',
}: LoanPromotionProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      You're eligible for a Quick Loan of up to UGX {(maxLoanAmount || 0).toLocaleString()}! Apply now on {SITE_NAME}.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="56" height="56" style={{ margin: '0 auto 10px' }} />
          <Text style={brandText}>{SITE_NAME}</Text>
        </Section>

        <Section style={heroBanner}>
          <Text style={heroEmoji}>💰</Text>
          <Text style={heroTitle}>Quick Loan Available!</Text>
          <Text style={heroSubtitle}>Instant salary-backed financing for employees</Text>
        </Section>

        <Heading style={h1}>Hello {employeeName}! 👋</Heading>

        <Text style={text}>
          Great news! As a valued member of the {SITE_NAME} team, you are eligible for our 
          <strong> Quick Loan facility</strong>. This is a convenient, low-interest loan deducted 
          from your future salary — no external paperwork required.
        </Text>

        <Section style={eligibilityBox}>
          <Text style={eligibilityTitle}>📋 Your Eligibility Summary</Text>
          <Hr style={divider} />
          <Text style={eligibilityRow}><strong>Your Tenure:</strong> {tenureMonths} months</Text>
          <Text style={eligibilityRow}><strong>Monthly Salary:</strong> UGX {(salary || 0).toLocaleString()}</Text>
          <Text style={eligibilityRow}><strong>Loan Multiplier:</strong> {multiplier} salary</Text>
          <Hr style={divider} />
          <Text style={limitLabel}>YOUR MAXIMUM LOAN LIMIT</Text>
          <Text style={limitAmount}>UGX {(maxLoanAmount || 0).toLocaleString()}</Text>
        </Section>

        <Section style={termsBox}>
          <Text style={termsTitle}>📌 Loan Terms & Conditions</Text>
          <Hr style={dividerLight} />
          <Text style={termItem}>✅ <strong>Interest Rate:</strong> {interestRate}% flat on the loan amount</Text>
          <Text style={termItem}>✅ <strong>Repayment:</strong> Automatic monthly deductions from salary</Text>
          <Text style={termItem}>✅ <strong>Max Repayment Period:</strong> Up to {maxRepaymentMonths} months</Text>
          <Text style={termItem}>✅ <strong>Guarantor Required:</strong> 1 colleague must guarantee your loan</Text>
          <Text style={termItem}>✅ <strong>Disbursement:</strong> Credited to your wallet upon approval</Text>
          <Text style={termItem}>✅ <strong>No hidden fees</strong> — what you see is what you pay</Text>
        </Section>

        <Section style={howItWorksBox}>
          <Text style={howTitle}>🔄 How It Works</Text>
          <Hr style={dividerLight} />
          <Text style={stepItem}><strong>Step 1:</strong> Log in to the system and go to <strong>My Wallet → Quick Loan</strong></Text>
          <Text style={stepItem}><strong>Step 2:</strong> Enter your desired loan amount (up to your limit)</Text>
          <Text style={stepItem}><strong>Step 3:</strong> Select a guarantor from your colleagues</Text>
          <Text style={stepItem}><strong>Step 4:</strong> Your guarantor approves via a secure code</Text>
          <Text style={stepItem}><strong>Step 5:</strong> Once approved, funds are credited to your wallet instantly!</Text>
        </Section>

        <Section style={ctaSection}>
          <Button href={loginUrl} style={ctaButton}>
            Apply for a Quick Loan Now
          </Button>
          <Text style={ctaHint}>
            Go to <strong>My Wallet → Quick Loan</strong> after logging in
          </Text>
        </Section>

        <Section style={capacityNote}>
          <Text style={capacityNoteText}>
            💡 <strong>Tenure Tip:</strong> Employees with 3+ months tenure can borrow up to <strong>2× their monthly salary</strong>. 
            Newer employees (under 3 months) can borrow up to <strong>1× salary</strong>. 
            The longer you stay, the more you can access!
          </Text>
        </Section>

        <Section style={recoveryNote}>
          <Text style={recoveryNoteText}>
            ⚠️ <strong>Recovery Policy:</strong> Monthly installments are automatically deducted. If your wallet balance 
            is insufficient, the system will attempt recovery from your guarantor's wallet, then from salary advances. 
            Please ensure timely repayment to maintain your borrowing capacity.
          </Text>
        </Section>

        <Text style={footer}>
          This is an informational notification from {SITE_NAME}.<br />
          If you have questions about the loan facility, please speak with Finance or your department head.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanPromotionEmail,
  subject: (data: Record<string, any>) =>
    `💰 You're Eligible for a Quick Loan of up to UGX ${(data.maxLoanAmount || 0).toLocaleString()}!`,
  displayName: 'Quick Loan promotion & eligibility',
  previewData: {
    employeeName: 'Tumwine Alex',
    maxLoanAmount: 600000,
    tenureMonths: 8,
    salary: 300000,
    multiplier: '2x',
    interestRate: 10,
    maxRepaymentMonths: 6,
    loginUrl: 'https://www.greatagrocoffeesystem.site',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const heroBanner = { backgroundColor: '#1a5c1a', borderRadius: '12px', padding: '24px 20px', margin: '0 0 20px', textAlign: 'center' as const }
const heroEmoji = { fontSize: '36px', margin: '0 0 8px' }
const heroTitle = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 4px' }
const heroSubtitle = { fontSize: '14px', color: '#c8e6c9', margin: '0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '10px 0 16px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const eligibilityBox = { backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '18px 20px', margin: '0 0 16px', border: '1px solid #bbf7d0' }
const eligibilityTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#166534', margin: '0 0 8px' }
const eligibilityRow = { fontSize: '14px', color: '#333333', margin: '6px 0', lineHeight: '1.5' }
const divider = { borderColor: '#bbf7d0', margin: '10px 0' }
const dividerLight = { borderColor: '#e5e7eb', margin: '8px 0' }
const limitLabel = { fontSize: '11px', color: '#166534', textTransform: 'uppercase' as const, letterSpacing: '1.5px', margin: '8px 0 4px', textAlign: 'center' as const }
const limitAmount = { fontSize: '30px', fontWeight: 'bold' as const, color: '#166534', margin: '0', textAlign: 'center' as const }
const termsBox = { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '18px 20px', margin: '0 0 16px', border: '1px solid #e2e8f0' }
const termsTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#334155', margin: '0 0 8px' }
const termItem = { fontSize: '13px', color: '#334155', margin: '6px 0', lineHeight: '1.5' }
const howItWorksBox = { backgroundColor: '#eff6ff', borderRadius: '10px', padding: '18px 20px', margin: '0 0 16px', border: '1px solid #bfdbfe' }
const howTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#1e40af', margin: '0 0 8px' }
const stepItem = { fontSize: '13px', color: '#1e3a5f', margin: '8px 0', lineHeight: '1.5' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const ctaButton = { backgroundColor: '#1a5c1a', borderRadius: '8px', color: '#ffffff', fontSize: '16px', fontWeight: 'bold' as const, padding: '14px 32px', textDecoration: 'none' }
const ctaHint = { fontSize: '12px', color: '#64748b', margin: '10px 0 0' }
const capacityNote = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '14px 16px', margin: '0 0 16px', border: '1px solid #86efac', borderLeft: '4px solid #22c55e' }
const capacityNoteText = { fontSize: '13px', color: '#166534', margin: '0', lineHeight: '1.5' }
const recoveryNote = { backgroundColor: '#fffbeb', borderRadius: '8px', padding: '14px 16px', margin: '0 0 20px', border: '1px solid #fde68a', borderLeft: '4px solid #d97706' }
const recoveryNoteText = { fontSize: '13px', color: '#92400e', margin: '0', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0', lineHeight: '1.5', borderTop: '1px solid #eee', paddingTop: '16px', textAlign: 'center' as const }
