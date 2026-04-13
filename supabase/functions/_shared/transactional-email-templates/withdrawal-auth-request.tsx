import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface WithdrawalAuthRequestProps {
  adminName?: string
  employeeName?: string
  amount?: number
  phone?: string
  ref?: string
  walletBalance?: number
}

const WithdrawalAuthRequestEmail = ({
  adminName = 'Admin',
  employeeName = 'Employee',
  amount = 0,
  phone = '',
  ref = '',
  walletBalance = 0,
}: WithdrawalAuthRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Action Required: Authorize withdrawal of UGX {(amount || 0).toLocaleString()} for {employeeName}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 auto 8px' }} />
          <Text style={brandText}>{SITE_NAME}</Text>
        </Section>

        <Section style={alertBox}>
          <Text style={alertText}>⚠️ AUTHORIZATION REQUIRED</Text>
        </Section>

        <Heading style={h1}>Withdrawal Pending Your Authorization</Heading>

        <Text style={text}>
          Dear {adminName}, a withdrawal request requires your authorization on the <strong>Yo Payments dashboard</strong>. Please log in and approve or decline the transaction.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Employee:</strong> {employeeName}</Text>
          <Hr style={divider} />
          <Text style={amountRow}>💰 UGX {(amount || 0).toLocaleString()}</Text>
          <Hr style={divider} />
          <Text style={detailRow}><strong>Phone (Beneficiary):</strong> {phone}</Text>
          <Text style={detailRow}><strong>Reference:</strong> {ref}</Text>
          <Text style={detailRow}><strong>Wallet Balance:</strong> UGX {(walletBalance || 0).toLocaleString()}</Text>
          <Text style={detailRow}><strong>Date:</strong> {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </Section>

        <Section style={instructionBox}>
          <Text style={instructionTitle}>🔐 How to Authorize:</Text>
          <Text style={instructionText}>1. Log in to <strong>Yo Payments</strong> dashboard</Text>
          <Text style={instructionText}>2. Go to <strong>Pending Transactions</strong> → <strong>My Authorizations</strong></Text>
          <Text style={instructionText}>3. Find the transaction for <strong>{employeeName}</strong> with reference <strong>{ref}</strong></Text>
          <Text style={instructionText}>4. Click <strong>"Authorize Transaction"</strong> or <strong>"Decline Transaction"</strong></Text>
        </Section>

        <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
          <Button style={ctaButton} href="https://paymentsapi1.yo.co.ug">
            Go to Yo Payments Dashboard
          </Button>
        </Section>

        <Text style={warningText}>
          ⏰ Please action this promptly. The employee's wallet has already been debited and will be refunded automatically if the request expires after 24 hours.
        </Text>

        <Text style={footer}>
          This is an automated notification from {SITE_NAME}. This email was sent because a withdrawal requires manual authorization on the Yo Payments platform.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WithdrawalAuthRequestEmail,
  subject: (data: Record<string, any>) =>
    `⚠️ Authorize Withdrawal: UGX ${(data.amount || 0).toLocaleString()} for ${data.employeeName || 'Employee'}`,
  displayName: 'Withdrawal authorization request',
  previewData: {
    adminName: 'Fauza',
    employeeName: 'Bwambale Denis',
    amount: 50000,
    phone: '256760698680',
    ref: 'INSTANT-WD-1776076895424',
    walletBalance: 335724,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '10px 0 20px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const alertBox = { backgroundColor: '#fff3e0', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', border: '2px solid #ff9800', textAlign: 'center' as const }
const alertText = { fontSize: '16px', fontWeight: 'bold' as const, color: '#e65100', margin: '0' }
const detailsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', border: '1px solid #e9ecef' }
const detailRow = { fontSize: '14px', color: '#333333', margin: '6px 0', lineHeight: '1.5' }
const amountRow = { fontSize: '24px', fontWeight: 'bold' as const, color: '#d32f2f', margin: '8px 0', textAlign: 'center' as const }
const divider = { borderColor: '#dee2e6', margin: '10px 0' }
const instructionBox = { backgroundColor: '#e3f2fd', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', border: '1px solid #90caf9' }
const instructionTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#1565c0', margin: '0 0 8px' }
const instructionText = { fontSize: '13px', color: '#1565c0', margin: '4px 0', lineHeight: '1.5' }
const ctaButton = { backgroundColor: '#1a5c1a', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none' }
const warningText = { fontSize: '13px', color: '#e65100', backgroundColor: '#fff8e1', padding: '10px 14px', borderRadius: '6px', margin: '0 0 20px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.4' }
