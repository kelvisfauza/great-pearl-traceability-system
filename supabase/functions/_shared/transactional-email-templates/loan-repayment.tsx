import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Pearl Coffee'

interface Props {
  employeeName?: string
  installmentNumber?: string
  amountDue?: string
  amountCollected?: string
  sources?: string
  remainingBalance?: string
  penaltyNote?: string
  salaryNote?: string
  isFullyPaid?: boolean
  isOverdue?: boolean
  overdueWeeks?: string
}

const LoanRepaymentEmail = ({
  employeeName, installmentNumber = '1', amountDue = '0', amountCollected = '0',
  sources = '', remainingBalance = '0', penaltyNote = '', salaryNote = '',
  isFullyPaid = true, isOverdue = false, overdueWeeks = '0',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{isFullyPaid ? '✅' : '⚠️'} Loan Repayment — Installment #{installmentNumber} {isFullyPaid ? 'Processed' : 'Partially Collected'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={isFullyPaid ? headerGreen : headerRed}>
          <Text style={headerEmoji}>{isFullyPaid ? '✅' : '⚠️'}</Text>
          <Heading style={h1}>Loan Repayment {isFullyPaid ? 'Processed' : 'Notice'}</Heading>
          <Text style={subtitle}>{SITE_NAME} — Installment #{installmentNumber}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>
            {isFullyPaid
              ? `Your loan repayment (installment #${installmentNumber}) has been successfully processed.`
              : `Installment #${installmentNumber} of UGX ${amountDue} is ${isOverdue ? `${overdueWeeks} week(s) OVERDUE` : 'DUE'}. We were unable to collect the full amount.`
            }
          </Text>

          <Section style={summaryCard}>
            <Text style={cardTitle}>📋 REPAYMENT DETAILS</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Amount Due:</td><td style={valueCell}>UGX {amountDue}</td></tr>
              <tr><td style={labelCell}>Amount Collected:</td><td style={{...valueCell, color: '#2e7d32'}}>UGX {amountCollected}</td></tr>
              {sources && <tr><td style={labelCell}>Sources:</td><td style={valueCell}>{sources}</td></tr>}
              {penaltyNote && <tr><td style={labelCell}>Penalty:</td><td style={{...valueCell, color: '#c62828'}}>{penaltyNote}</td></tr>}
              <tr><td style={labelCell}>Remaining Loan Balance:</td><td style={valueBold}>UGX {remainingBalance}</td></tr>
            </table>
          </Section>

          {!isFullyPaid && (
            <Section style={warningBox}>
              <Text style={warningText}>⚠️ Your loan installment has a shortfall. Penalties increase each week overdue (max 2 weeks). New loan applications are BLOCKED until resolved.</Text>
            </Section>
          )}

          {salaryNote && (
            <Section style={noteBox}>
              <Text style={noteText}>💼 {salaryNote}</Text>
            </Section>
          )}

          <Hr style={divider} />
          <Text style={closingText}>Log in to your dashboard to view your full loan and repayment history.</Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Finance Department</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Loan repayment notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanRepaymentEmail,
  subject: (data: Record<string, any>) =>
    data.isFullyPaid
      ? `✅ Loan Repayment Processed — Installment #${data.installmentNumber || '1'}`
      : `⚠️ Loan Repayment Due — Installment #${data.installmentNumber || '1'}`,
  displayName: 'Loan repayment',
  previewData: {
    employeeName: 'Jane Doe', installmentNumber: '3', amountDue: '145,667',
    amountCollected: '145,667', sources: 'Wallet: UGX 145,667', remainingBalance: '291,333',
    isFullyPaid: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const headerGreen = { backgroundColor: '#1a5632', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerRed = { backgroundColor: '#b71c1c', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerEmoji = { fontSize: '36px', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 20px' }
const summaryCard = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #c8e6c9' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 8px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#ddd', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '6px 8px 6px 0', width: '45%' }
const valueCell = { fontSize: '13px', color: '#333', padding: '6px 0', fontWeight: '500' as const }
const valueBold = { fontSize: '14px', color: '#1a5632', padding: '6px 0', fontWeight: 'bold' as const }
const warningBox = { backgroundColor: '#fbe9e7', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', borderLeft: '4px solid #c62828' }
const warningText = { fontSize: '12px', color: '#b71c1c', margin: '0', lineHeight: '1.5' }
const noteBox = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', borderLeft: '4px solid #ff9800' }
const noteText = { fontSize: '12px', color: '#555', margin: '0', lineHeight: '1.5' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
