import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface AdminWithdrawalPinProps {
  name?: string
  code?: string
  amount?: string
  reason?: string
  initiatedBy?: string
}

const AdminWithdrawalPinEmail = ({ name, code = '12345', amount, reason, initiatedBy }: AdminWithdrawalPinProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🔐 Withdrawal PIN — {code} — An admin has initiated a withdrawal from your account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Admin Withdrawal Request</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>{name ? `Dear ${name},` : 'Dear Team Member,'}</Text>
          <Text style={bodyText}>
            An administrator has initiated a withdrawal from your wallet. Please use the PIN below on your dashboard to confirm this withdrawal:
          </Text>
          <Section style={detailBox}>
            <Text style={detailItem}><strong>Amount:</strong> UGX {amount || '0'}</Text>
            {reason && <Text style={detailItem}><strong>Reason:</strong> {reason}</Text>}
            {initiatedBy && <Text style={detailItem}><strong>Initiated By:</strong> {initiatedBy}</Text>}
          </Section>
          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={bodyText}>
            This PIN expires in <strong>10 minutes</strong>. Enter it on the prompt that appears on your screen.
          </Text>
          <Text style={warningText}>
            ⚠️ If you did NOT authorize this withdrawal, contact administration immediately and DO NOT enter this PIN.
          </Text>
          <Hr style={divider} />
          <Text style={footer}>{SITE_NAME} — Kasese, Uganda</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminWithdrawalPinEmail,
  subject: '🔐 Admin Withdrawal PIN — Action Required',
  displayName: 'Admin-initiated withdrawal PIN',
  previewData: { name: 'Timothy', code: '84729', amount: '150,000', reason: 'Salary advance recovery', initiatedBy: 'Finance Manager' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { backgroundColor: '#b91c1c', padding: '25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#fca5a5', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 18px' }
const detailBox = { backgroundColor: '#fef2f2', borderRadius: '8px', padding: '12px 16px', margin: '0 0 18px', borderLeft: '4px solid #b91c1c' }
const detailItem = { fontSize: '14px', color: '#333', margin: '0 0 4px' }
const codeBox = { backgroundColor: '#f4f4f4', borderRadius: '8px', padding: '18px', textAlign: 'center' as const, margin: '0 0 18px' }
const codeText = { fontFamily: 'Courier, monospace', fontSize: '36px', fontWeight: 'bold', color: '#b91c1c', letterSpacing: '10px', margin: '0' }
const warningText = { fontSize: '13px', color: '#d32f2f', lineHeight: '1.5', margin: '0 0 18px' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
