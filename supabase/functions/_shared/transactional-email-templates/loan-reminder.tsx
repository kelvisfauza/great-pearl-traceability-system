import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  loanAmount?: string
  installmentAmount?: string
  dueDate?: string
  installmentNumber?: string
  remainingBalance?: string
  frequency?: string
}

const LoanReminderEmail = ({
  employeeName, loanAmount = '0', installmentAmount = '0',
  dueDate = '', installmentNumber = '1', remainingBalance = '0', frequency = 'month',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>📅 Loan Repayment Reminder — UGX {installmentAmount} due {dueDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>📅</Text>
          <Heading style={h1}>Loan Repayment Reminder</Heading>
          <Text style={subtitle}>{SITE_NAME} — Upcoming Deduction</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>
            This is a reminder that your loan repayment (installment #{installmentNumber}) is due soon.
            Please ensure your wallet has sufficient funds.
          </Text>

          <Section style={summaryCard}>
            <Text style={cardTitle}>📋 UPCOMING PAYMENT</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Installment Amount:</td><td style={valueBold}>UGX {installmentAmount}</td></tr>
              <tr><td style={labelCell}>Due Date:</td><td style={{...valueCell, fontWeight: 'bold'}}>{dueDate}</td></tr>
              <tr><td style={labelCell}>Installment #:</td><td style={valueCell}>{installmentNumber}</td></tr>
              <tr><td style={labelCell}>Remaining Balance:</td><td style={valueCell}>UGX {remainingBalance}</td></tr>
            </table>
          </Section>

          <Section style={noteBox}>
            <Text style={noteText}>💡 Tip: Ensure your wallet balance covers UGX {installmentAmount} by {dueDate}. Insufficient funds will trigger automatic recovery from your guarantor's wallet, followed by salary deduction.</Text>
          </Section>

          <Hr style={divider} />
          <Text style={closingText}>Log in to view your full repayment schedule and wallet balance.</Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Finance Department</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Loan repayment reminder</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanReminderEmail,
  subject: (data: Record<string, any>) => `📅 Loan Reminder — UGX ${data.installmentAmount || '0'} due ${data.dueDate || 'soon'}`,
  displayName: 'Loan reminder',
  previewData: {
    employeeName: 'Jane Doe', installmentAmount: '145,667', dueDate: '1 May 2026',
    installmentNumber: '2', remainingBalance: '291,333', frequency: 'month',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#e65100', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerEmoji = { fontSize: '36px', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 20px' }
const summaryCard = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #ffe082' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#e65100', margin: '0 0 8px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#ffe082', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '6px 8px 6px 0', width: '45%' }
const valueCell = { fontSize: '13px', color: '#333', padding: '6px 0', fontWeight: '500' as const }
const valueBold = { fontSize: '14px', color: '#e65100', padding: '6px 0', fontWeight: 'bold' as const }
const noteBox = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', borderLeft: '4px solid #1a5632' }
const noteText = { fontSize: '12px', color: '#555', margin: '0', lineHeight: '1.5' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
