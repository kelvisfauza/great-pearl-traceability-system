import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface Props {
  employeeName?: string
  amount?: string
  reason?: string
  reference?: string
  balanceAfter?: string
  claimedAt?: string
}

const BonusClaimedEmail = ({
  employeeName = 'Employee',
  amount = '0',
  reason = 'Bonus',
  reference = 'N/A',
  balanceAfter = '0',
  claimedAt = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🎉 Bonus of UGX {amount} claimed — Ref: {reference}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>🎉</Text>
          <Heading style={h1}>Bonus Claimed!</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName},</Text>
          <Text style={bodyText}>
            Your bonus has been successfully claimed and credited to your wallet.
          </Text>

          <Section style={detailsCard}>
            <Text style={detailLabel}>Amount Credited</Text>
            <Text style={detailValue}>UGX {amount}</Text>
            <Text style={detailReason}>{reason}</Text>
          </Section>

          <Section style={infoTable}>
            <Text style={infoRow}>
              <span style={infoLabel}>Reference:</span>{' '}
              <span style={infoVal}>{reference}</span>
            </Text>
            <Text style={infoRow}>
              <span style={infoLabel}>Claimed At:</span>{' '}
              <span style={infoVal}>{claimedAt}</span>
            </Text>
          </Section>

          <Section style={balanceCard}>
            <Text style={balanceLabel}>Wallet Balance After Credit</Text>
            <Text style={balanceValue}>UGX {balanceAfter}</Text>
          </Section>

          <Hr style={divider} />
          <Text style={closingText}>
            This amount is now available in your wallet. You can withdraw when withdrawals are enabled.
          </Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} HR Department</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Bonus claim confirmation</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BonusClaimedEmail,
  subject: (data: Record<string, any>) => `🎉 Bonus Claimed — UGX ${data.amount || '0'} | Ref: ${data.reference || 'N/A'}`,
  displayName: 'Bonus claimed',
  previewData: {
    employeeName: 'Jane Doe',
    amount: '50,000',
    reason: 'Employee of the Month Reward',
    reference: 'BNS-20260406-AB12',
    balanceAfter: '175,000',
    claimedAt: '06 Apr 2026, 9:30 PM',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#7c3aed', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerEmoji = { fontSize: '36px', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#d4b8ff', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 20px' }
const detailsCard = { backgroundColor: '#7c3aed', borderRadius: '8px', padding: '24px', textAlign: 'center' as const, margin: '0 0 16px' }
const detailLabel = { fontSize: '12px', color: '#d4b8ff', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const detailValue = { fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 4px' }
const detailReason = { fontSize: '13px', color: '#d4b8ff', margin: '0' }
const infoTable = { backgroundColor: '#f8f5ff', borderRadius: '8px', padding: '16px', margin: '0 0 16px' }
const infoRow = { fontSize: '14px', color: '#333', margin: '0 0 8px', lineHeight: '1.5' }
const infoLabel = { color: '#666', fontWeight: 'normal' as const }
const infoVal = { fontWeight: 'bold' as const, fontFamily: 'monospace' }
const balanceCard = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', textAlign: 'center' as const, margin: '0 0 16px' }
const balanceLabel = { fontSize: '12px', color: '#15803d', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const balanceValue = { fontSize: '24px', fontWeight: 'bold', color: '#15803d', margin: '0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
