import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface InstantWithdrawalConfirmationProps {
  employeeName?: string
  amount?: number
  phone?: string
  ref?: string
  status?: string
  remainingBalance?: number
}

const InstantWithdrawalConfirmationEmail = ({
  employeeName = 'Employee',
  amount = 0,
  phone = '',
  ref = '',
  status = 'success',
  remainingBalance,
}: InstantWithdrawalConfirmationProps) => {
  const isPending = status === 'pending_approval'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {isPending
          ? `Your instant withdrawal of UGX ${(amount || 0).toLocaleString()} is awaiting approval`
          : `Your instant withdrawal of UGX ${(amount || 0).toLocaleString()} has been sent to ${phone}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 auto 8px' }} />
            <Text style={brandText}>{SITE_NAME}</Text>
          </Section>

          <Heading style={h1}>
            {isPending ? '⏳ Withdrawal Pending Approval' : '💸 Instant Withdrawal Sent'}
          </Heading>

          <Text style={text}>
            Dear {employeeName}, {isPending
              ? 'your instant withdrawal request has been created and is awaiting admin approval. You will be notified once it is processed.'
              : 'your instant withdrawal has been successfully processed and sent to your Mobile Money number.'}
          </Text>

          <Section style={detailsBox}>
            <Text style={detailRow}><strong>Employee:</strong> {employeeName}</Text>
            <Hr style={divider} />
            <Text style={amountRow}>💰 UGX {(amount || 0).toLocaleString()}</Text>
            <Text style={detailRow}><strong>Method:</strong> Mobile Money (Instant)</Text>
            <Text style={detailRow}><strong>Phone:</strong> {phone}</Text>
            <Text style={detailRow}><strong>Reference:</strong> {ref}</Text>
            <Text style={detailRow}><strong>Status:</strong> {isPending ? '⏳ Pending Approval' : '✅ Sent'}</Text>
            <Text style={detailRow}><strong>Date:</strong> {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          </Section>

          <Section style={isPending ? pendingBox : successBox}>
            <Text style={isPending ? pendingText : successText}>
              {isPending
                ? '⏳ This withdrawal is pending admin authorization. Your wallet has been debited and will be refunded if the request is declined.'
                : '✅ This amount has been deducted from your wallet and sent to your Mobile Money account.'}
            </Text>
          </Section>

          {remainingBalance !== undefined && (
            <Section style={balanceBox}>
              <Text style={balanceLabel}>Wallet Balance After Transaction</Text>
              <Text style={balanceAmount}>UGX {(remainingBalance || 0).toLocaleString()}</Text>
            </Section>
          )}

          <Text style={footer}>
            This is an automated notification from {SITE_NAME}. For questions, contact Finance or reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InstantWithdrawalConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data.status === 'pending_approval'
      ? `Withdrawal Pending - UGX ${(data.amount || 0).toLocaleString()}`
      : `Instant Withdrawal Sent - UGX ${(data.amount || 0).toLocaleString()}`,
  displayName: 'Instant withdrawal confirmation',
  previewData: {
    employeeName: 'Denis Bwambale',
    amount: 50000,
    phone: '0761234567',
    ref: 'INSTANT-WD-abc123',
    status: 'success',
    remainingBalance: 335724,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '10px 0 20px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const detailsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', border: '1px solid #e9ecef' }
const detailRow = { fontSize: '14px', color: '#333333', margin: '6px 0', lineHeight: '1.5' }
const amountRow = { fontSize: '24px', fontWeight: 'bold' as const, color: '#d32f2f', margin: '8px 0', textAlign: 'center' as const }
const divider = { borderColor: '#dee2e6', margin: '10px 0' }
const successBox = { backgroundColor: '#e8f5e9', borderRadius: '8px', padding: '12px 16px', margin: '0 0 20px', border: '1px solid #a5d6a7' }
const successText = { fontSize: '13px', color: '#2e7d32', margin: '0' }
const pendingBox = { backgroundColor: '#fff3e0', borderRadius: '8px', padding: '12px 16px', margin: '0 0 20px', border: '1px solid #ffcc80' }
const pendingText = { fontSize: '13px', color: '#e65100', margin: '0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.4' }
const balanceBox = { backgroundColor: '#1a5c1a', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', textAlign: 'center' as const }
const balanceLabel = { fontSize: '12px', color: '#c8e6c9', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const balanceAmount = { fontSize: '28px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0' }
