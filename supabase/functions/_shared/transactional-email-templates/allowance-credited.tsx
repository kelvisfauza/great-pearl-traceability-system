import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  allowanceType?: string
  amount?: string
  month?: string
  disbursementMethod?: string
  phone?: string
}

const AllowanceCreditedEmail = ({
  employeeName, allowanceType = 'Allowance', amount = '0', month = '',
  disbursementMethod, phone,
}: Props) => {
  const isAirtime = /airtime/i.test(allowanceType) || /airtime/i.test(disbursementMethod || '')
  const destinationLabel = isAirtime
    ? `sent as airtime to your phone${phone ? ` (${phone})` : ''}`
    : 'credited to your wallet'
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>✅ {allowanceType} of UGX {amount} {destinationLabel}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>✅</Text>
          <Heading style={h1}>{allowanceType} {isAirtime ? 'Sent' : 'Credited'}</Heading>
          <Text style={subtitle}>{SITE_NAME} — {month}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>
            Your monthly <strong>{allowanceType.toLowerCase()}</strong> for <strong>{month}</strong> has been {destinationLabel}.
          </Text>

          <Section style={amountCard}>
            <Text style={amountLabel}>{isAirtime ? 'Airtime Sent' : 'Amount Credited'}</Text>
            <Text style={amountValue}>UGX {amount}</Text>
            <Text style={amountType}>{allowanceType}</Text>
          </Section>

          <Hr style={divider} />
          <Text style={closingText}>
            {isAirtime
              ? 'Please check your phone to confirm the airtime has arrived. If you do not receive it within a few minutes, contact HR.'
              : 'Log in to your dashboard to view your updated wallet balance.'}
          </Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} HR Department</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Monthly allowance notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: AllowanceCreditedEmail,
  subject: (data: Record<string, any>) => `✅ ${data.allowanceType || 'Allowance'} Credited — UGX ${data.amount || '0'}`,
  displayName: 'Allowance credited',
  previewData: { employeeName: 'Jane Doe', allowanceType: 'Transport Allowance', amount: '50,000', month: 'April 2026' },
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
const amountCard = { backgroundColor: '#1a5632', borderRadius: '8px', padding: '24px', textAlign: 'center' as const, margin: '0 0 16px' }
const amountLabel = { fontSize: '12px', color: '#a8d5ba', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const amountValue = { fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 4px' }
const amountType = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
