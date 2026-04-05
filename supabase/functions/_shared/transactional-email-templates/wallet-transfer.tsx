import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Column, Row,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface WalletTransferProps {
  direction?: 'sent' | 'received'
  userName?: string
  counterpartyName?: string
  amount?: string
  newBalance?: string
  reference?: string
  transferDate?: string
}

const fmt = (v: string | number) => `UGX ${Number(v).toLocaleString()}`

const WalletTransferEmail = ({
  direction = 'sent',
  userName = 'User',
  counterpartyName = 'Colleague',
  amount = '0',
  newBalance = '0',
  reference = 'N/A',
  transferDate = new Date().toLocaleDateString(),
}: WalletTransferProps) => {
  const isSent = direction === 'sent'
  const emoji = isSent ? '📤' : '📥'
  const color = isSent ? '#dc2626' : '#16a34a'
  const bgColor = isSent ? '#fef2f2' : '#f0fdf4'
  const borderColor = isSent ? '#fecaca' : '#bbf7d0'
  const label = isSent ? 'Money Sent' : 'Money Received'
  const preposition = isSent ? 'to' : 'from'

  return (
    <Html>
      <Head />
      <Preview>{emoji} {fmt(amount)} {isSent ? 'sent to' : 'received from'} {counterpartyName}</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Arial, sans-serif', padding: '20px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '520px', margin: '0 auto', overflow: 'hidden' }}>
          
          <Section style={{ backgroundColor: color, padding: '20px 28px', textAlign: 'center' as const }}>
            <Text style={{ color: '#ffffff', fontSize: '28px', margin: '0 0 4px' }}>{emoji}</Text>
            <Heading style={{ color: '#ffffff', fontSize: '20px', margin: '0' }}>{label}</Heading>
          </Section>

          <Section style={{ padding: '24px 28px' }}>
            <Text style={{ color: '#374151', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px' }}>
              Dear <strong>{userName}</strong>,
            </Text>

            <Section style={{ backgroundColor: bgColor, borderRadius: '10px', padding: '20px', border: `1px solid ${borderColor}`, textAlign: 'center' as const }}>
              <Text style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', margin: '0 0 4px' }}>
                Amount {isSent ? 'Sent' : 'Received'}
              </Text>
              <Text style={{ color: color, fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px' }}>
                {fmt(amount)}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: '13px', margin: '0' }}>
                {isSent ? 'Sent to' : 'Received from'} <strong>{counterpartyName}</strong>
              </Text>
            </Section>

            <Section style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', marginTop: '16px', border: '1px solid #e5e7eb' }}>
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0', textTransform: 'uppercase' as const }}>New Balance</Text>
                  <Text style={{ color: '#111827', fontSize: '18px', fontWeight: 'bold', margin: '4px 0 0' }}>{fmt(newBalance)}</Text>
                </Column>
                <Column style={{ width: '50%' }}>
                  <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0', textTransform: 'uppercase' as const }}>Date</Text>
                  <Text style={{ color: '#111827', fontSize: '14px', fontWeight: 'bold', margin: '4px 0 0' }}>{transferDate}</Text>
                </Column>
              </Row>
            </Section>

            <Hr style={{ borderColor: '#e5e7eb', margin: '16px 0' }} />

            <Text style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' as const, margin: '0' }}>
              Reference: <strong>{reference}</strong>
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: '11px', textAlign: 'center' as const, margin: '8px 0 0' }}>
              If you did not authorize this transaction, please contact your administrator immediately.
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#f9fafb', padding: '12px 28px', borderTop: '1px solid #e5e7eb' }}>
            <Text style={{ color: '#9ca3af', fontSize: '11px', textAlign: 'center' as const, margin: '0' }}>
              {SITE_NAME} • Loyalty Wallet Notification
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: WalletTransferEmail,
  subject: (data) => data.direction === 'received'
    ? `📥 You received UGX ${Number(data.amount || 0).toLocaleString()} from ${data.counterpartyName}`
    : `📤 UGX ${Number(data.amount || 0).toLocaleString()} sent to ${data.counterpartyName}`,
  displayName: 'Wallet Transfer',
}
