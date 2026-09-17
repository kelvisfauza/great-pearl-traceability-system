import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface Props {
  employeeName?: string
  amount?: string
  activityCount?: number | string
  awardDate?: string
  walletBalance?: string
}

const LoyaltyDailyCreditEmail = ({
  employeeName, amount = '0', activityCount = 0, awardDate = '', walletBalance,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Daily loyalty collection of UGX {amount} credited to your wallet</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Daily Loyalty Collection</Heading>
          <Text style={subtitle}>{SITE_NAME} — {awardDate}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Team Member'},</Text>
          <Text style={bodyText}>
            Your loyalty points for <strong>{awardDate}</strong> have been collected and credited
            to your wallet as a single daily payment.
          </Text>

          <Section style={amountCard}>
            <Text style={amountLabel}>Credited to your wallet</Text>
            <Text style={amountValue}>UGX {amount}</Text>
            <Text style={amountType}>{activityCount} rewarded activities today</Text>
          </Section>

          {walletBalance ? (
            <Text style={bodyText}>
              Your wallet balance is now <strong>UGX {walletBalance}</strong>.
            </Text>
          ) : null}

          <Hr style={divider} />
          <Text style={closingText}>
            Points are now collected quietly during the day and paid out once every evening at 8:00 PM.
            Fair-use limits still apply, and balances remain available in your wallet as usual.
          </Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Management</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Daily loyalty credit notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoyaltyDailyCreditEmail,
  subject: (data: Record<string, any>) => `Daily loyalty credited — UGX ${data.amount || '0'}`,
  displayName: 'Daily loyalty credit',
  previewData: { employeeName: 'Jane Doe', amount: '3,250', activityCount: 12, awardDate: '17 September 2026', walletBalance: '120,000' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 20px' }
const amountCard = { backgroundColor: '#1a5632', borderRadius: '8px', padding: '24px', textAlign: 'center' as const, margin: '0 0 16px' }
const amountLabel = { fontSize: '12px', color: '#a8d5ba', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const amountValue = { fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 4px' }
const amountType = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
