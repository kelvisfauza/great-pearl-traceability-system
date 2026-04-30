import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface Props {
  employeeName?: string
  amount?: string
  phone?: string
  depositorName?: string
  reference?: string
  date?: string
  newBalance?: string
}

const WalletDepositCreditedEmail = ({
  employeeName, amount = '0', phone = '', depositorName = '', reference = '', date = '', newBalance,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Wallet credited with UGX {amount} via USSD</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Wallet Deposit Confirmed</Heading>
          <Text style={subtitle}>{SITE_NAME}{date ? ` — ${date}` : ''}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>
            {depositorName
              ? `A USSD wallet deposit from ${depositorName} (${phone}) has been credited to your account.`
              : 'Your USSD wallet deposit has been received and credited to your account.'}
          </Text>

          <Section style={amountCard}>
            <Text style={amountLabel}>Amount Deposited</Text>
            <Text style={amountValue}>UGX {amount}</Text>
            {phone ? (
              <Text style={amountType}>
                {depositorName ? `Deposited by ${depositorName} • ${phone}` : `From mobile ${phone}`}
              </Text>
            ) : null}
          </Section>

          <Section style={detailsCard}>
            <Text style={detailRow}><strong>Reference:</strong> {reference || '—'}</Text>
            <Text style={detailRow}><strong>Channel:</strong> USSD Mobile Money</Text>
            {depositorName ? <Text style={detailRow}><strong>Depositor:</strong> {depositorName}</Text> : null}
            {newBalance ? <Text style={detailRow}><strong>New wallet balance:</strong> UGX {newBalance}</Text> : null}
          </Section>

          <Hr style={divider} />
          <Text style={closingText}>
            This deposit now appears on your wallet statement. If you did not authorize this transaction, please contact operations immediately.
          </Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Finance Team</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • USSD wallet deposit confirmation</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WalletDepositCreditedEmail,
  subject: (data: Record<string, any>) => `Wallet Deposit Confirmed — UGX ${data.amount || '0'}`,
  displayName: 'USSD wallet deposit credited',
  previewData: {
    employeeName: 'Jane Doe',
    amount: '50,000',
    phone: '256778536681',
    reference: 'USSD-SVC-1234567890-AB12',
    date: 'April 30, 2026',
    newBalance: '125,000',
  },
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
const detailsCard = { backgroundColor: '#f5f7f5', borderRadius: '6px', padding: '14px 18px', margin: '0 0 16px' }
const detailRow = { fontSize: '13px', color: '#333', margin: '4px 0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }