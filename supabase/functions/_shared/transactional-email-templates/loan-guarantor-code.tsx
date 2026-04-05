import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Pearl Coffee'

interface GuarantorCodeProps {
  guarantorName?: string
  borrowerName?: string
  loanAmount?: string
  duration?: string
  approvalCode?: string
}

const LoanGuarantorCodeEmail = ({ guarantorName, borrowerName = 'Employee', loanAmount = '0', duration = '1', approvalCode = '0000' }: GuarantorCodeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🤝 Loan Guarantor Request — Approval Code: {approvalCode}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Guarantor Approval Request</Heading>
          <Text style={subtitle}>{SITE_NAME} Loan System</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>{guarantorName ? `Dear ${guarantorName},` : 'Dear Guarantor,'}</Text>
          <Text style={bodyText}>
            <strong>{borrowerName}</strong> has requested you to guarantee a loan. Please review the details below:
          </Text>
          <Section style={detailBox}>
            <Text style={detailItem}><strong>Borrower:</strong> {borrowerName}</Text>
            <Text style={detailItem}><strong>Loan Amount:</strong> UGX {loanAmount}</Text>
            <Text style={detailItem}><strong>Duration:</strong> {duration} month(s)</Text>
          </Section>
          <Text style={bodyText}>Your approval code is:</Text>
          <Section style={codeBox}>
            <Text style={codeText}>{approvalCode}</Text>
          </Section>
          <Text style={bodyText}>
            Log into the system to <strong>approve or decline</strong> this request. Enter the code above when approving.
          </Text>
          <Text style={warningText}>
            ⚠️ By guaranteeing this loan, you agree to be liable if the borrower defaults. Do NOT share this code.
          </Text>
          <Hr style={divider} />
          <Text style={footer}>{SITE_NAME} — Kasese, Uganda</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanGuarantorCodeEmail,
  subject: (data: Record<string, any>) => `🤝 Loan Guarantor Request from ${data.borrowerName || 'Employee'}`,
  displayName: 'Loan guarantor approval code',
  previewData: { guarantorName: 'Jane', borrowerName: 'John', loanAmount: '500,000', duration: '3', approvalCode: '7890' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 18px' }
const detailBox = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '14px 16px', margin: '0 0 18px', borderLeft: '4px solid #1a5632' }
const detailItem = { fontSize: '14px', color: '#333', margin: '0 0 6px' }
const codeBox = { backgroundColor: '#f4f4f4', borderRadius: '8px', padding: '18px', textAlign: 'center' as const, margin: '0 0 18px' }
const codeText = { fontFamily: 'Courier, monospace', fontSize: '36px', fontWeight: 'bold', color: '#1a5632', letterSpacing: '10px', margin: '0' }
const warningText = { fontSize: '13px', color: '#d32f2f', lineHeight: '1.5', margin: '0 0 18px' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
