import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  borrowerName?: string
  guarantorName?: string
  loanAmount?: string
  durationMonths?: string
  action?: string
  isApproved?: boolean
}

const LoanGuarantorResponseEmail = ({
  borrowerName, guarantorName = '', loanAmount = '0',
  durationMonths = '1', action = 'approved', isApproved = true,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{isApproved ? '✅' : '❌'} Your guarantor {guarantorName} has {action} your loan request</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={isApproved ? headerGreen : headerRed}>
          <Text style={headerEmoji}>{isApproved ? '✅' : '❌'}</Text>
          <Heading style={h1}>Guarantor {isApproved ? 'Approved' : 'Declined'}</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {borrowerName || 'Employee'},</Text>
          <Text style={bodyText}>
            {isApproved
              ? `Your guarantor ${guarantorName} has approved your loan request. It is now pending admin approval.`
              : `Your guarantor ${guarantorName} has declined your loan request. Log in to select a new guarantor for the same application.`
            }
          </Text>

          <Section style={summaryCard}>
            <Text style={cardTitle}>📋 LOAN DETAILS</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Loan Amount:</td><td style={valueCell}>UGX {loanAmount}</td></tr>
              <tr><td style={labelCell}>Duration:</td><td style={valueCell}>{durationMonths} month(s)</td></tr>
              <tr><td style={labelCell}>Guarantor:</td><td style={valueCell}>{guarantorName}</td></tr>
              <tr><td style={labelCell}>Decision:</td><td style={{...valueCell, color: isApproved ? '#2e7d32' : '#c62828', fontWeight: 'bold'}}>{isApproved ? 'APPROVED' : 'DECLINED'}</td></tr>
              {isApproved && <tr><td style={labelCell}>Next Step:</td><td style={{...valueCell, color: '#e65100'}}>Pending Admin Approval</td></tr>}
            </table>
          </Section>

          {!isApproved && (
            <Section style={noteBox}>
              <Text style={noteText}>💡 You can modify your loan application and select a different guarantor. Your loan amount and terms will be preserved.</Text>
            </Section>
          )}

          <Hr style={divider} />
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Team</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Loan status notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanGuarantorResponseEmail,
  subject: (data: Record<string, any>) =>
    data.isApproved
      ? `✅ Guarantor Approved — Loan pending admin approval`
      : `❌ Guarantor Declined — Select a new guarantor`,
  displayName: 'Loan guarantor response',
  previewData: {
    borrowerName: 'Jane Doe', guarantorName: 'John Smith', loanAmount: '500,000',
    durationMonths: '3', isApproved: true,
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
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 8px' }
const cardDivider = { borderColor: '#ddd', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '6px 8px 6px 0', width: '40%' }
const valueCell = { fontSize: '13px', color: '#333', padding: '6px 0', fontWeight: '500' as const }
const noteBox = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', borderLeft: '4px solid #ff9800' }
const noteText = { fontSize: '12px', color: '#555', margin: '0', lineHeight: '1.5' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
