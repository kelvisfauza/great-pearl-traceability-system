import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface RequestExpiredRefundProps {
  employeeName?: string
  requestType?: string
  amount?: string
  requestDate?: string
  refundAmount?: string
}

const RequestExpiredRefundEmail = ({
  employeeName = 'Team Member',
  requestType = 'Request',
  amount = '0',
  requestDate = '',
  refundAmount = '0',
}: RequestExpiredRefundProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {requestType} of UGX {amount} has expired and been refunded</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Request Expired & Refunded</Heading>
        <Text style={text}>Dear {employeeName},</Text>
        <Text style={text}>
          Your <strong>{requestType}</strong> submitted on <strong>{requestDate}</strong> for{' '}
          <strong>UGX {amount}</strong> was not approved within the required 24-hour window.
        </Text>

        <Section style={infoBox}>
          <Text style={infoText}>⏰ <strong>Reason:</strong> No approval received within 24 hours</Text>
          <Text style={infoText}>💰 <strong>Refunded Amount:</strong> UGX {refundAmount}</Text>
          <Text style={infoText}>📋 <strong>Status:</strong> Expired — Funds re-credited to your wallet</Text>
        </Section>

        <Text style={text}>
          The full amount has been automatically returned to your wallet balance. You may submit a new request if still needed.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>Best regards, The {SITE_NAME} Finance Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RequestExpiredRefundEmail,
  subject: (data: Record<string, any>) =>
    `Your ${data?.requestType || 'Request'} of UGX ${data?.amount || '0'} has expired & been refunded`,
  displayName: 'Request expired refund notification',
  previewData: {
    employeeName: 'Jane Doe',
    requestType: 'Withdrawal Request',
    amount: '100,000',
    requestDate: 'Apr 9, 2026',
    refundAmount: '100,000',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '580px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#b91c1c', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { backgroundColor: '#fef2f2', borderLeft: '4px solid #b91c1c', padding: '14px 18px', borderRadius: '6px', margin: '16px 0' }
const infoText = { fontSize: '14px', color: '#333', margin: '4px 0', lineHeight: '1.5' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
