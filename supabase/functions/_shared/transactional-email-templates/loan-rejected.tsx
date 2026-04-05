import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  loanAmount?: string
  rejectionReason?: string
  loanType?: string
}

const LoanRejectedEmail = ({
  employeeName, loanAmount = '0', rejectionReason = 'Not specified', loanType = 'Quick Loan',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>❌ Loan Request Declined — UGX {loanAmount}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>❌</Text>
          <Heading style={h1}>Loan Request Declined</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>
            We regret to inform you that your <strong>{loanType.toLowerCase()}</strong> request of <strong>UGX {loanAmount}</strong> has been declined by administration.
          </Text>

          <Section style={reasonCard}>
            <Text style={cardTitle}>📋 REJECTION DETAILS</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Loan Type:</td><td style={valueCell}>{loanType}</td></tr>
              <tr><td style={labelCell}>Requested Amount:</td><td style={valueCell}>UGX {loanAmount}</td></tr>
              <tr><td style={labelCell}>Reason:</td><td style={{...valueCell, color: '#c62828'}}>{rejectionReason}</td></tr>
            </table>
          </Section>

          <Section style={noteBox}>
            <Text style={noteText}>💡 You may submit a new loan application after addressing the reason above. Contact Administration or Finance if you have questions.</Text>
          </Section>

          <Hr style={divider} />
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Administration</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Loan decision notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanRejectedEmail,
  subject: (data: Record<string, any>) => `❌ Loan Request Declined — UGX ${data.loanAmount || '0'}`,
  displayName: 'Loan rejected',
  previewData: { employeeName: 'Jane Doe', loanAmount: '500,000', rejectionReason: 'Insufficient tenure', loanType: 'Quick Loan' },
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
const reasonCard = { backgroundColor: '#fbe9e7', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #ef9a9a' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#b71c1c', margin: '0 0 8px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#ef9a9a', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '6px 8px 6px 0', width: '40%' }
const valueCell = { fontSize: '13px', color: '#333', padding: '6px 0', fontWeight: '500' as const }
const noteBox = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', borderLeft: '4px solid #1a5632' }
const noteText = { fontSize: '12px', color: '#555', margin: '0', lineHeight: '1.5' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
