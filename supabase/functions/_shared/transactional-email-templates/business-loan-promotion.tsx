import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Img, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

const BASE = 'https://great-pearl-traceability-system.lovable.app'
const HERO_IMG = `${BASE}/__l5e/assets-v1/0bd26c6d-a89a-46f2-ada3-76d919d3575e/business-loan-hero.jpg`
const SHOP_IMG = `${BASE}/__l5e/assets-v1/d51c81bb-071e-47a1-a5f7-91a5813a5e7e/business-loan-shop.jpg`

interface BusinessLoanPromotionProps {
  employeeName?: string
  maxLoanAmount?: number
  interestRate?: number
  maxRepaymentMonths?: number
  interestCapPercent?: number
  loginUrl?: string
}

const fmt = (n: number) => `UGX ${(n || 0).toLocaleString()}`

const BusinessLoanPromotionEmail = ({
  employeeName = 'Team Member',
  maxLoanAmount = 15000000,
  interestRate = 4,
  maxRepaymentMonths = 8,
  interestCapPercent = 30,
  loginUrl = 'https://www.greatagrocoffeesystem.site',
}: BusinessLoanPromotionProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Grow your side business with an Employee Business Loan of up to {fmt(maxLoanAmount)} at {interestRate}% per month.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="56" height="56" style={{ margin: '0 auto 10px' }} />
          <Text style={brandText}>{SITE_NAME}</Text>
          <Text style={brandSub}>a member of YEDA COFFEE COMPANY LIMITED</Text>
        </Section>

        <Section style={heroWrap}>
          <Img src={HERO_IMG} alt="Employees running their own businesses" width="580" style={heroImg} />
          <Section style={heroCaption}>
            <Text style={heroTitle}>Employee Business Loan</Text>
            <Text style={heroSubtitle}>
              Capital to build the business that backs up your employment
            </Text>
          </Section>
        </Section>

        <Heading style={h1}>Dear {employeeName},</Heading>

        <Text style={text}>
          {SITE_NAME} is now offering the <strong>Employee Business Loan</strong> — our lowest-rate
          facility, designed specifically for staff who run or want to start a business alongside
          their job. Bigger capital, longer repayment, and a rate that leaves room for your profit.
        </Text>

        <Section style={limitBox}>
          <Text style={limitLabel}>BORROW UP TO</Text>
          <Text style={limitAmount}>{fmt(maxLoanAmount)}</Text>
          <Text style={limitNote}>
            Your final amount is set by the automated evaluation of you and your two guarantors.
          </Text>
        </Section>

        <Row style={statRow}>
          <Column style={statCol}>
            <Text style={statValue}>{interestRate}%</Text>
            <Text style={statLabel}>per month, flat</Text>
          </Column>
          <Column style={statCol}>
            <Text style={statValue}>{maxRepaymentMonths}</Text>
            <Text style={statLabel}>months to repay</Text>
          </Column>
          <Column style={statCol}>
            <Text style={statValue}>2</Text>
            <Text style={statLabel}>guarantors needed</Text>
          </Column>
        </Row>

        <Section style={splitBox}>
          <Row>
            <Column style={{ width: '46%', paddingRight: '12px' }}>
              <Img src={SHOP_IMG} alt="Shop owner using mobile money" width="240" style={splitImg} />
            </Column>
            <Column style={{ width: '54%' }}>
              <Text style={splitTitle}>What you can fund</Text>
              <Text style={splitItem}>• Stock and inventory for a shop or stall</Text>
              <Text style={splitItem}>• Produce buying and agri-inputs</Text>
              <Text style={splitItem}>• Boda, transport or delivery assets</Text>
              <Text style={splitItem}>• Salon, poultry, piggery, rentals</Text>
              <Text style={splitItem}>• Equipment and working capital</Text>
            </Column>
          </Row>
        </Section>

        <Section style={termsBox}>
          <Text style={termsTitle}>Key terms</Text>
          <Hr style={dividerLight} />
          <Text style={termItem}><strong>Interest:</strong> {interestRate}% per month flat, total interest capped at {interestCapPercent}%</Text>
          <Text style={termItem}><strong>Tenure:</strong> 1 to {maxRepaymentMonths} months, monthly repayment</Text>
          <Text style={termItem}><strong>Guarantors:</strong> Two colleagues, each approving with their own 6-digit code</Text>
          <Text style={termItem}><strong>Limit:</strong> Not capped by your salary — it follows your guarantors' combined capacity</Text>
          <Text style={termItem}><strong>Repayment:</strong> Wallet collections, mobile money or payroll</Text>
          <Text style={termItem}><strong>Fees:</strong> No hidden charges — what you see is what you pay</Text>
        </Section>

        <Section style={stepsBox}>
          <Text style={stepsTitle}>How to apply</Text>
          <Hr style={dividerLight} />
          <Text style={stepItem}><strong>1.</strong> Log in and open <strong>My Wallet → Loans → Business Loan</strong></Text>
          <Text style={stepItem}><strong>2.</strong> Enter your amount, tenure and business details</Text>
          <Text style={stepItem}><strong>3.</strong> Add your two guarantors and accept the Terms &amp; Conditions</Text>
          <Text style={stepItem}><strong>4.</strong> Both guarantors approve with their codes</Text>
          <Text style={stepItem}><strong>5.</strong> Admin and Finance approve, and funds land in your wallet</Text>
        </Section>

        <Section style={ctaSection}>
          <Button href={loginUrl} style={ctaButton}>Apply for a Business Loan</Button>
          <Text style={ctaHint}>Applications are reviewed on working days.</Text>
        </Section>

        <Section style={noteBox}>
          <Text style={noteText}>
            <strong>Please note:</strong> guarantors are assessed on salary, wallet position and
            existing exposure, and their wallets can be recovered from if repayments fall behind.
            Borrow only what your business can comfortably repay.
          </Text>
        </Section>

        <Text style={footer}>
          {SITE_NAME} · a member of YEDA COFFEE COMPANY LIMITED<br />
          P.O Box 431420, Kasese, Uganda · +256 393 001 626 / +256 393 101 103<br />
          Questions? Speak to Finance or your department head.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BusinessLoanPromotionEmail,
  subject: (data: Record<string, any>) =>
    `Employee Business Loan — up to ${fmt(data.maxLoanAmount || 15000000)} at ${data.interestRate || 4}% per month`,
  displayName: 'Employee Business Loan advert',
  previewData: {
    employeeName: 'Tumwine Alex',
    maxLoanAmount: 15000000,
    interestRate: 4,
    maxRepaymentMonths: 8,
    interestCapPercent: 30,
    loginUrl: 'https://www.greatagrocoffeesystem.site',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#f5f7f5', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto', backgroundColor: '#ffffff' }
const header = { textAlign: 'center' as const, padding: '16px 0 12px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const brandSub = { fontSize: '11px', color: '#6b7280', margin: '2px 0 0', letterSpacing: '0.5px' }
const heroWrap = { margin: '0 0 20px' }
const heroImg = { width: '100%', borderRadius: '12px 12px 0 0', display: 'block' }
const heroCaption = { backgroundColor: '#1a5c1a', borderRadius: '0 0 12px 12px', padding: '16px 20px', textAlign: 'center' as const }
const heroTitle = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 4px' }
const heroSubtitle = { fontSize: '13px', color: '#c8e6c9', margin: '0' }
const h1 = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '6px 0 12px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 18px' }
const limitBox = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '18px 20px', margin: '0 0 16px', textAlign: 'center' as const }
const limitLabel = { fontSize: '11px', color: '#166534', textTransform: 'uppercase' as const, letterSpacing: '1.5px', margin: '0 0 4px' }
const limitAmount = { fontSize: '30px', fontWeight: 'bold' as const, color: '#166534', margin: '0 0 6px' }
const limitNote = { fontSize: '12px', color: '#4b5563', margin: '0' }
const statRow = { margin: '0 0 18px' }
const statCol = { width: '33%', textAlign: 'center' as const, padding: '10px 4px' }
const statValue = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const statLabel = { fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }
const splitBox = { backgroundColor: '#fafafa', borderRadius: '10px', padding: '14px', margin: '0 0 16px' }
const splitImg = { width: '100%', borderRadius: '8px', display: 'block' }
const splitTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#166534', margin: '0 0 8px' }
const splitItem = { fontSize: '13px', color: '#374151', margin: '4px 0', lineHeight: '1.4' }
const termsBox = { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 18px', margin: '0 0 16px' }
const termsTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 6px' }
const termItem = { fontSize: '13px', color: '#374151', margin: '6px 0', lineHeight: '1.5' }
const stepsBox = { backgroundColor: '#f0f7ff', borderRadius: '10px', padding: '16px 18px', margin: '0 0 18px' }
const stepsTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#1e3a8a', margin: '0 0 6px' }
const stepItem = { fontSize: '13px', color: '#374151', margin: '6px 0', lineHeight: '1.5' }
const dividerLight = { borderColor: '#e5e7eb', margin: '8px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '0 0 18px' }
const ctaButton = { backgroundColor: '#1a5c1a', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, padding: '13px 28px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
const ctaHint = { fontSize: '12px', color: '#6b7280', margin: '10px 0 0' }
const noteBox = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px 16px', margin: '0 0 18px' }
const noteText = { fontSize: '12px', color: '#78350f', margin: '0', lineHeight: '1.6' }
const footer = { fontSize: '11px', color: '#9ca3af', textAlign: 'center' as const, lineHeight: '1.6', margin: '10px 0 0' }
