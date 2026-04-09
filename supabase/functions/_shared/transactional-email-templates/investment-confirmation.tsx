import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Great Agro Coffee"

interface InvestmentConfirmationProps {
  employeeName?: string
  amount?: number
  interestRate?: number
  maturityMonths?: number
  expectedReturn?: number
  startDate?: string
  maturityDate?: string
  investmentRef?: string
}

const InvestmentConfirmationEmail = ({
  employeeName,
  amount = 0,
  interestRate = 10,
  maturityMonths = 5,
  expectedReturn = 0,
  startDate,
  maturityDate,
  investmentRef,
}: InvestmentConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your investment of UGX {amount.toLocaleString()} has been confirmed - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logoText}>📈 {SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          Investment Confirmed!
        </Heading>

        <Text style={greeting}>
          {employeeName ? `Dear ${employeeName},` : 'Dear Investor,'}
        </Text>

        <Text style={text}>
          Your investment has been successfully created and your funds are now locked. Here are the details:
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Reference:</strong> {investmentRef || 'N/A'}</Text>
          <Text style={detailRow}><strong>Amount Invested:</strong> UGX {amount.toLocaleString()}</Text>
          <Text style={detailRow}><strong>Interest Rate:</strong> {interestRate}% per {maturityMonths} months</Text>
          <Text style={detailRow}><strong>Maturity Period:</strong> {maturityMonths} months</Text>
          <Text style={detailRow}><strong>Start Date:</strong> {startDate || new Date().toLocaleDateString()}</Text>
          <Text style={detailRow}><strong>Maturity Date:</strong> {maturityDate || 'Calculating...'}</Text>
          <Hr style={divider} />
          <Text style={highlightRow}>
            <strong>Expected Return:</strong> UGX {expectedReturn.toLocaleString()}
          </Text>
          <Text style={profitRow}>
            Profit: UGX {(expectedReturn - amount).toLocaleString()}
          </Text>
        </Section>

        <Text style={text}>
          Your funds will remain locked for {maturityMonths} months. At maturity, the full amount plus interest will be credited to your wallet automatically.
        </Text>

        <Section style={warningBox}>
          <Text style={warningText}>
            ⚠️ <strong>Early Withdrawal:</strong> If you withdraw before maturity, a reduced interest rate of 3% will apply instead of {interestRate}%.
          </Text>
        </Section>

        <Text style={footer}>
          Thank you for investing with {SITE_NAME}. Your money is working for you!
        </Text>
        <Text style={footerSmall}>
          This is an automated notification. Please do not reply to this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvestmentConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Investment Confirmed - UGX ${(data.amount || 0).toLocaleString()} Locked`,
  displayName: 'Investment confirmation',
  previewData: {
    employeeName: 'John Doe',
    amount: 500000,
    interestRate: 10,
    maturityMonths: 5,
    expectedReturn: 550000,
    startDate: '2026-04-09',
    maturityDate: '2026-09-09',
    investmentRef: 'INVEST-12345678',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '18px', fontWeight: 'bold' as const, color: '#2563eb' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1e293b', margin: '0 0 20px', textAlign: 'center' as const }
const greeting = { fontSize: '15px', color: '#334155', margin: '0 0 10px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const detailsBox = { backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#334155', margin: '4px 0', lineHeight: '1.5' }
const divider = { borderColor: '#bae6fd', margin: '12px 0' }
const highlightRow = { fontSize: '16px', color: '#0f766e', margin: '4px 0', lineHeight: '1.5' }
const profitRow = { fontSize: '14px', color: '#16a34a', margin: '4px 0', fontWeight: 'bold' as const }
const warningBox = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', margin: '0 0 20px' }
const warningText = { fontSize: '13px', color: '#92400e', margin: '0', lineHeight: '1.5' }
const footer = { fontSize: '13px', color: '#64748b', margin: '20px 0 5px' }
const footerSmall = { fontSize: '11px', color: '#94a3b8', margin: '0' }
