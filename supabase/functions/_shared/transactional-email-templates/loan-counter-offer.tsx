import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Pearl Coffee'

interface Props {
  employeeName?: string
  currentAmount?: string
  offeredAmount?: string
  comments?: string
  loanType?: string
  durationMonths?: string
}

const LoanCounterOfferEmail = ({
  employeeName, currentAmount = '0', offeredAmount = '0',
  comments = '', loanType = 'Quick Loan', durationMonths = '1',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🔄 Loan Counter Offer — UGX {offeredAmount} offered (from UGX {currentAmount})</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>🔄</Text>
          <Heading style={h1}>Loan Counter Offer</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>
            Management has reviewed your <strong>{loanType.toLowerCase()}</strong> request and is offering an alternative amount.
            Please log in to accept or decline this counter offer.
          </Text>

          <Section style={comparisonCard}>
            <Text style={cardTitle}>📊 COUNTER OFFER COMPARISON</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Your Request:</td><td style={{...valueCell, textDecoration: 'line-through', color: '#999'}}>UGX {currentAmount}</td></tr>
              <tr><td style={labelCell}>Counter Offer:</td><td style={{...valueCell, color: '#1a5632', fontWeight: 'bold', fontSize: '16px'}}>UGX {offeredAmount}</td></tr>
              <tr><td style={labelCell}>Duration:</td><td style={valueCell}>{durationMonths} month(s)</td></tr>
              {comments && <tr><td style={labelCell}>Reason:</td><td style={valueCell}>{comments}</td></tr>}
            </table>
          </Section>

          <Section style={actionBox}>
            <Text style={actionText}>⏳ Please log in to your dashboard to <strong>Accept</strong> or <strong>Decline</strong> this counter offer.</Text>
          </Section>

          <Hr style={divider} />
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Administration</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Loan counter offer notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanCounterOfferEmail,
  subject: (data: Record<string, any>) => `🔄 Loan Counter Offer — UGX ${data.offeredAmount || '0'}`,
  displayName: 'Loan counter offer',
  previewData: {
    employeeName: 'Jane Doe', currentAmount: '500,000', offeredAmount: '300,000',
    comments: 'Based on your current tenure', loanType: 'Quick Loan', durationMonths: '3',
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
const comparisonCard = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #ffe082' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#e65100', margin: '0 0 8px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#ffe082', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '6px 8px 6px 0', width: '40%' }
const valueCell = { fontSize: '13px', color: '#333', padding: '6px 0', fontWeight: '500' as const }
const actionBox = { backgroundColor: '#e3f2fd', borderRadius: '8px', padding: '16px', margin: '0 0 16px', textAlign: 'center' as const, border: '1px solid #90caf9' }
const actionText = { fontSize: '14px', color: '#1565c0', margin: '0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
