import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  guarantorName?: string
  borrowerName?: string
  amountDeducted?: string
  installmentNumber?: string
  reason?: string
}

const GuarantorRecoveryEmail = ({
  guarantorName, borrowerName = '', amountDeducted = '0',
  installmentNumber = '1', reason = 'Borrower had insufficient funds',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🔴 Guarantor Deduction — UGX {amountDeducted} recovered from your wallet</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>🔴</Text>
          <Heading style={h1}>Guarantor Recovery Notice</Heading>
          <Text style={subtitle}>{SITE_NAME} — Loan Recovery</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {guarantorName || 'Guarantor'},</Text>
          <Text style={bodyText}>
            As the guarantor for <strong>{borrowerName}</strong>'s loan, a deduction has been made from your wallet
            because the borrower had insufficient funds for their scheduled repayment.
          </Text>

          <Section style={alertCard}>
            <Text style={cardTitle}>💳 DEDUCTION DETAILS</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Amount Deducted:</td><td style={{...valueCell, color: '#c62828', fontWeight: 'bold'}}>UGX {amountDeducted}</td></tr>
              <tr><td style={labelCell}>Borrower:</td><td style={valueCell}>{borrowerName}</td></tr>
              <tr><td style={labelCell}>Installment:</td><td style={valueCell}>#{installmentNumber}</td></tr>
              <tr><td style={labelCell}>Reason:</td><td style={valueCell}>{reason}</td></tr>
            </table>
          </Section>

          <Section style={noteBox}>
            <Text style={noteText}>ℹ️ This deduction is part of the guarantor agreement signed when you approved {borrowerName}'s loan. If you believe this is an error, please contact Administration immediately.</Text>
          </Section>

          <Hr style={divider} />
          <Text style={closingText}>Log in to your dashboard to review your wallet balance and guaranteed loan status.</Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Finance Department</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Guarantor recovery notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GuarantorRecoveryEmail,
  subject: (data: Record<string, any>) => `🔴 Guarantor Recovery — UGX ${data.amountDeducted || '0'} deducted from your wallet`,
  displayName: 'Guarantor recovery',
  previewData: {
    guarantorName: 'John Smith', borrowerName: 'Jane Doe', amountDeducted: '50,000',
    installmentNumber: '2', reason: 'Borrower had insufficient funds',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#b71c1c', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerEmoji = { fontSize: '36px', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 20px' }
const alertCard = { backgroundColor: '#fbe9e7', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #ef9a9a' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#b71c1c', margin: '0 0 8px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#ef9a9a', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '6px 8px 6px 0', width: '45%' }
const valueCell = { fontSize: '13px', color: '#333', padding: '6px 0', fontWeight: '500' as const }
const noteBox = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', borderLeft: '4px solid #ff9800' }
const noteText = { fontSize: '12px', color: '#555', margin: '0', lineHeight: '1.5' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
