import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Agro Coffee'

interface Props {
  employeeName?: string
  principal?: number
  interest?: number
  payout?: number
  interestRate?: number
  maturityDate?: string
  investmentRef?: string
}

const Email = ({
  employeeName,
  principal = 0,
  interest = 0,
  payout = 0,
  interestRate = 25,
  maturityDate,
  investmentRef,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your investment has matured - UGX {payout.toLocaleString()} credited to your wallet</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logoText}>{SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>Investment Matured & Credited</Heading>

        <Text style={greeting}>{employeeName ? `Dear ${employeeName},` : 'Dear Investor,'}</Text>

        <Text style={text}>
          Great news! Your investment has reached maturity and the full amount plus interest has been automatically credited to your wallet.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Reference:</strong> {investmentRef || 'N/A'}</Text>
          <Text style={detailRow}><strong>Principal:</strong> UGX {principal.toLocaleString()}</Text>
          <Text style={detailRow}><strong>Interest Earned ({interestRate}%):</strong> UGX {interest.toLocaleString()}</Text>
          <Text style={detailRow}><strong>Maturity Date:</strong> {maturityDate || new Date().toLocaleDateString()}</Text>
          <Hr style={divider} />
          <Text style={highlightRow}><strong>Total Credited:</strong> UGX {payout.toLocaleString()}</Text>
        </Section>

        <Text style={text}>
          The funds are now available in your wallet. You can withdraw them, transfer them, or reinvest for another 3-month cycle at 25% interest.
        </Text>

        <Text style={footer}>Thank you for investing with {SITE_NAME}.</Text>
        <Text style={footerSmall}>This is an automated notification. Please do not reply to this email.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Investment Matured - UGX ${(data.payout || 0).toLocaleString()} Credited`,
  displayName: 'Investment matured payout',
  previewData: {
    employeeName: 'John Doe',
    principal: 500000,
    interest: 125000,
    payout: 625000,
    interestRate: 25,
    maturityDate: '2026-09-09',
    investmentRef: 'INVEST-MATURE-12345678',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logoText = { fontSize: '18px', fontWeight: 'bold' as const, color: '#2563eb' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1e293b', margin: '0 0 20px', textAlign: 'center' as const }
const greeting = { fontSize: '15px', color: '#334155', margin: '0 0 10px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const detailsBox = { backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#334155', margin: '4px 0', lineHeight: '1.5' }
const divider = { borderColor: '#a7f3d0', margin: '12px 0' }
const highlightRow = { fontSize: '16px', color: '#047857', margin: '4px 0', lineHeight: '1.5' }
const footer = { fontSize: '13px', color: '#64748b', margin: '20px 0 5px' }
const footerSmall = { fontSize: '11px', color: '#94a3b8', margin: '0' }