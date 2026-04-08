import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface AdminWithdrawalConfirmedProps {
  name?: string
  amount?: string
  reason?: string
  initiatedBy?: string
  reference?: string
  remainingBalance?: string
}

const AdminWithdrawalConfirmedEmail = ({ name, amount, reason, initiatedBy, reference, remainingBalance }: AdminWithdrawalConfirmedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>✅ Withdrawal of UGX {amount || '0'} confirmed from your account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Withdrawal Confirmed</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>{name ? `Dear ${name},` : 'Dear Team Member,'}</Text>
          <Text style={bodyText}>
            A withdrawal has been successfully processed from your wallet. Here are the details:
          </Text>
          <Section style={detailBox}>
            <Text style={detailItem}><strong>Amount Deducted:</strong> UGX {amount || '0'}</Text>
            {reason && <Text style={detailItem}><strong>Reason:</strong> {reason}</Text>}
            {initiatedBy && <Text style={detailItem}><strong>Initiated By:</strong> {initiatedBy}</Text>}
            {reference && <Text style={detailItem}><strong>Reference:</strong> {reference}</Text>}
            {remainingBalance && <Text style={detailItem}><strong>Remaining Balance:</strong> UGX {remainingBalance}</Text>}
          </Section>
          <Text style={bodyText}>
            This amount has been deducted from your wallet and credited to the company system.
          </Text>
          <Text style={warningNote}>
            If you believe this withdrawal is incorrect, please contact the Finance Department immediately.
          </Text>
          <Hr style={divider} />
          <Text style={footer}>{SITE_NAME} — Kasese, Uganda</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminWithdrawalConfirmedEmail,
  subject: '✅ Wallet Withdrawal Confirmed',
  displayName: 'Admin withdrawal confirmed',
  previewData: { name: 'Timothy', amount: '150,000', reason: 'Salary advance recovery', initiatedBy: 'Finance Manager', reference: 'ADM-WD-ABC123', remainingBalance: '350,000' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 18px' }
const detailBox = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '12px 16px', margin: '0 0 18px', borderLeft: '4px solid #1a5632' }
const detailItem = { fontSize: '14px', color: '#333', margin: '0 0 4px' }
const warningNote = { fontSize: '13px', color: '#b45309', lineHeight: '1.5', margin: '0 0 18px', fontStyle: 'italic' as const }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
