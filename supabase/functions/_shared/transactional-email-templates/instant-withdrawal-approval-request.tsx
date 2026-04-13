import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface InstantWithdrawalApprovalRequestProps {
  approverName?: string
  employeeName?: string
  amount?: number
  phone?: string
  ref?: string
  remainingBalance?: number
  requestDate?: string
}

const InstantWithdrawalApprovalRequestEmail = ({
  approverName = 'Admin',
  employeeName = 'Employee',
  amount = 0,
  phone = '',
  ref = '',
  remainingBalance,
  requestDate = new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
}: InstantWithdrawalApprovalRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Instant Withdrawal Approval Needed: UGX {(amount || 0).toLocaleString()} for {employeeName}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 auto 8px' }} />
          <Text style={brandText}>{SITE_NAME}</Text>
        </Section>

        <Section style={alertBox}>
          <Text style={alertText}>🔔 APPROVAL REQUIRED</Text>
        </Section>

        <Heading style={h1}>Instant Withdrawal Pending Approval</Heading>

        <Text style={text}>
          Dear {approverName}, an instant withdrawal request has been submitted and requires your attention. Please review the details below and take action on the system.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Employee:</strong> {employeeName}</Text>
          <Hr style={divider} />
          <Text style={amountRow}>💰 UGX {(amount || 0).toLocaleString()}</Text>
          <Hr style={divider} />
          <Text style={detailRow}><strong>Method:</strong> Mobile Money (Instant)</Text>
          <Text style={detailRow}><strong>Phone:</strong> {phone}</Text>
          <Text style={detailRow}><strong>Reference:</strong> {ref}</Text>
          {remainingBalance !== undefined && (
            <Text style={detailRow}><strong>Employee Wallet Balance After:</strong> UGX {(remainingBalance || 0).toLocaleString()}</Text>
          )}
          <Text style={detailRow}><strong>Date:</strong> {requestDate}</Text>
        </Section>

        <Section style={infoBox}>
          <Text style={infoText}>
            📌 This withdrawal is currently <strong>pending approval</strong>. The employee's wallet has already been debited. If not approved within 24 hours, the amount will be automatically refunded.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
          <Button style={ctaButton} href="https://greatpearlfinance.com/wallet-management">
            Review on System Dashboard
          </Button>
        </Section>

        <Text style={warningText}>
          ⏰ Please action this promptly to avoid delays in the employee receiving their funds.
        </Text>

        <Text style={footer}>
          This is an automated notification from {SITE_NAME}. For questions, contact Finance or reply to this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InstantWithdrawalApprovalRequestEmail,
  subject: (data: Record<string, any>) =>
    `🔔 Approve Instant Withdrawal: UGX ${(data.amount || 0).toLocaleString()} for ${data.employeeName || 'Employee'}`,
  displayName: 'Instant withdrawal approval request (system)',
  previewData: {
    approverName: 'Fauza',
    employeeName: 'Bwambale Denis',
    amount: 50000,
    phone: '0761234567',
    ref: 'INSTANT-WD-abc123',
    remainingBalance: 285724,
    requestDate: 'Monday, 14 April, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '10px 0 20px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const alertBox = { backgroundColor: '#e8f5e9', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', border: '2px solid #4caf50', textAlign: 'center' as const }
const alertText = { fontSize: '16px', fontWeight: 'bold' as const, color: '#2e7d32', margin: '0' }
const detailsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', border: '1px solid #e9ecef' }
const detailRow = { fontSize: '14px', color: '#333333', margin: '6px 0', lineHeight: '1.5' }
const amountRow = { fontSize: '24px', fontWeight: 'bold' as const, color: '#d32f2f', margin: '8px 0', textAlign: 'center' as const }
const divider = { borderColor: '#dee2e6', margin: '10px 0' }
const infoBox = { backgroundColor: '#e3f2fd', borderRadius: '8px', padding: '12px 16px', margin: '0 0 20px', border: '1px solid #90caf9' }
const infoText = { fontSize: '13px', color: '#1565c0', margin: '0', lineHeight: '1.5' }
const ctaButton = { backgroundColor: '#1a5c1a', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none' }
const warningText = { fontSize: '13px', color: '#e65100', backgroundColor: '#fff8e1', padding: '10px 14px', borderRadius: '6px', margin: '0 0 20px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.4' }
