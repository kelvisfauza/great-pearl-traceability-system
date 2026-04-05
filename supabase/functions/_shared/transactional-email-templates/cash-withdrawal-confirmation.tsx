import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface CashWithdrawalConfirmationProps {
  employeeName?: string
  amount?: number
  method?: string
  approvedBy?: string
  department?: string
  position?: string
  remainingBalance?: number
  isCopy?: boolean
}

const CashWithdrawalConfirmationEmail = ({
  employeeName = 'Employee',
  amount = 0,
  method = 'Cash',
  approvedBy = 'Finance',
  department = '',
  position = '',
  remainingBalance,
  isCopy = false,
}: CashWithdrawalConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isCopy
        ? `Copy: Cash withdrawal of UGX ${(amount || 0).toLocaleString()} processed for ${employeeName}`
        : `Your cash withdrawal of UGX ${(amount || 0).toLocaleString()} has been processed`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandText}>☕ {SITE_NAME}</Text>
        </Section>

        {isCopy && (
          <Section style={copyBanner}>
            <Text style={copyBannerText}>📋 COPY — This is a copy for your records</Text>
          </Section>
        )}

        <Heading style={h1}>Cash Withdrawal Confirmed</Heading>

        <Text style={text}>
          {isCopy
            ? `This confirms that a cash withdrawal has been processed for ${employeeName}.`
            : `Dear ${employeeName}, your cash withdrawal has been successfully processed. Below are the details:`}
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Employee:</strong> {employeeName}</Text>
          {department && <Text style={detailRow}><strong>Department:</strong> {department}</Text>}
          {position && <Text style={detailRow}><strong>Position:</strong> {position}</Text>}
          <Hr style={divider} />
          <Text style={amountRow}>💰 UGX {(amount || 0).toLocaleString()}</Text>
          <Text style={detailRow}><strong>Method:</strong> {method}</Text>
          <Text style={detailRow}><strong>Approved By:</strong> {approvedBy}</Text>
          <Text style={detailRow}><strong>Date:</strong> {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </Section>

        <Section style={successBox}>
          <Text style={successText}>✅ This withdrawal has been deducted from your wallet balance.</Text>
        </Section>

        {remainingBalance !== undefined && (
          <Section style={balanceBox}>
            <Text style={balanceLabel}>Wallet Balance After Transaction</Text>
            <Text style={balanceAmount}>UGX {(remainingBalance || 0).toLocaleString()}</Text>
          </Section>
        )}

        <Text style={footer}>
          This is an automated notification from {SITE_NAME}. For questions, contact Finance or reply to this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CashWithdrawalConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data.isCopy
      ? `Copy: Cash Withdrawal - ${data.employeeName || 'Employee'} (UGX ${(data.amount || 0).toLocaleString()})`
      : `Cash Withdrawal Confirmed - UGX ${(data.amount || 0).toLocaleString()}`,
  displayName: 'Cash withdrawal confirmation',
  previewData: {
    employeeName: 'Tumwine Alex',
    amount: 200000,
    method: 'Cash',
    approvedBy: 'Fauza Kusa',
    department: 'Quality Control',
    position: 'EUDR',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '10px 0 20px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const detailsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', border: '1px solid #e9ecef' }
const detailRow = { fontSize: '14px', color: '#333333', margin: '6px 0', lineHeight: '1.5' }
const amountRow = { fontSize: '24px', fontWeight: 'bold' as const, color: '#d32f2f', margin: '8px 0', textAlign: 'center' as const }
const divider = { borderColor: '#dee2e6', margin: '10px 0' }
const successBox = { backgroundColor: '#e8f5e9', borderRadius: '8px', padding: '12px 16px', margin: '0 0 20px', border: '1px solid #a5d6a7' }
const successText = { fontSize: '13px', color: '#2e7d32', margin: '0' }
const copyBanner = { backgroundColor: '#e3f2fd', borderRadius: '6px', padding: '8px 14px', margin: '0 0 16px', textAlign: 'center' as const }
const copyBannerText = { fontSize: '12px', color: '#1565c0', margin: '0', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.4' }
const balanceBox = { backgroundColor: '#1a5c1a', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', textAlign: 'center' as const }
const balanceLabel = { fontSize: '12px', color: '#c8e6c9', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const balanceAmount = { fontSize: '28px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0' }
