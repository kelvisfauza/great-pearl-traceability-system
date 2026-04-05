import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  guarantorName?: string
  loanAmount?: string
}

const LoanGuarantorRevokedEmail = ({
  employeeName, guarantorName = '', loanAmount = '0',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>⚠️ Guarantor Revoked — {guarantorName} has withdrawn their guarantee</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>⚠️</Text>
          <Heading style={h1}>Guarantor Revoked</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>
            Your guarantor <strong>{guarantorName}</strong> has revoked their guarantee for your loan of <strong>UGX {loanAmount}</strong>.
          </Text>

          <Section style={alertCard}>
            <Text style={alertText}>You need to select a new guarantor for the same application. Log in to your dashboard to update your loan request.</Text>
          </Section>

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
  component: LoanGuarantorRevokedEmail,
  subject: `⚠️ Guarantor Revoked — Select a new guarantor`,
  displayName: 'Loan guarantor revoked',
  previewData: { employeeName: 'Jane Doe', guarantorName: 'John Smith', loanAmount: '500,000' },
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
const alertCard = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '16px', margin: '0 0 16px', borderLeft: '4px solid #ff9800' }
const alertText = { fontSize: '14px', color: '#e65100', margin: '0', lineHeight: '1.5' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
