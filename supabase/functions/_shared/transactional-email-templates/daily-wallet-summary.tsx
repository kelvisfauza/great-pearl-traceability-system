import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  loyaltyEarned?: string
  bonusEarned?: string
  deductions?: string
  walletBalance?: string
  summaryDate?: string
}

const WalletSummaryEmail = ({
  employeeName, loyaltyEarned = '0', bonusEarned = '0',
  deductions = '0', walletBalance = '0', summaryDate = 'Yesterday',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>💰 Your daily wallet summary — Balance: UGX {walletBalance}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>💰</Text>
          <Heading style={h1}>Daily Wallet Summary</Heading>
          <Text style={subtitle}>{SITE_NAME} — {summaryDate}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>Here is your wallet activity summary for {summaryDate.toLowerCase()}:</Text>

          <Section style={summaryCard}>
            <Text style={cardTitle}>📊 ACTIVITY BREAKDOWN</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr>
                <td style={labelCell}>Loyalty Rewards:</td>
                <td style={{...valueCell, color: '#2e7d32'}}>+ UGX {loyaltyEarned}</td>
              </tr>
              <tr>
                <td style={labelCell}>Bonuses:</td>
                <td style={{...valueCell, color: '#2e7d32'}}>+ UGX {bonusEarned}</td>
              </tr>
              <tr>
                <td style={labelCell}>Deductions:</td>
                <td style={{...valueCell, color: '#c62828'}}>- UGX {deductions}</td>
              </tr>
            </table>
          </Section>

          <Section style={balanceCard}>
            <Text style={balanceLabel}>Current Wallet Balance</Text>
            <Text style={balanceValue}>UGX {walletBalance}</Text>
          </Section>

          <Hr style={divider} />
          <Text style={closingText}>
            This summary is sent daily at 9:00 AM EAT. Log in to your dashboard for full transaction history.
          </Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Team</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Automated daily summary</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WalletSummaryEmail,
  subject: (data: Record<string, any>) => `💰 Daily Wallet Summary — Balance: UGX ${data.walletBalance || '0'}`,
  displayName: 'Daily wallet summary',
  previewData: {
    employeeName: 'Jane Doe', loyaltyEarned: '12,500', bonusEarned: '5,000',
    deductions: '3,200', walletBalance: '145,300', summaryDate: 'Yesterday',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerEmoji = { fontSize: '36px', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 20px' }
const summaryCard = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #c8e6c9' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 8px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#ddd', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '6px 8px 6px 0', width: '50%' }
const valueCell = { fontSize: '14px', color: '#333', padding: '6px 0', fontWeight: 'bold' as const }
const balanceCard = { backgroundColor: '#1a5632', borderRadius: '8px', padding: '20px', textAlign: 'center' as const, margin: '0 0 16px' }
const balanceLabel = { fontSize: '12px', color: '#a8d5ba', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const balanceValue = { fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: '0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
