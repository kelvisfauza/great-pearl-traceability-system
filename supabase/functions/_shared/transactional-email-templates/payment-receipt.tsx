import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface PaymentReceiptProps {
  recipientName?: string
  reference?: string
  description?: string
  invoiceNumber?: string
  amount?: string
  charges?: string
  total?: string
  paymentMethod?: string
  transactionId?: string
  processedBy?: string
  pdfUrl?: string
}

const Row = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <Text style={rowText}>
      <span style={rowLabel}>{label}:</span> <span style={rowValue}>{value}</span>
    </Text>
  ) : null

const PaymentReceiptEmail = ({
  recipientName, reference, description, invoiceNumber,
  amount, charges, total, paymentMethod, transactionId, processedBy, pdfUrl,
}: PaymentReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment Receipt {reference} — {total}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment Receipt</Heading>
        <Text style={refBadge}>{reference}</Text>

        {recipientName && <Text style={text}>Dear {recipientName},</Text>}
        <Text style={text}>
          This serves as your official Payment Receipt from {SITE_NAME} — Finance Department.
        </Text>

        <Section style={card}>
          <Row label="Description" value={description} />
          <Row label="Invoice Reference" value={invoiceNumber} />
          <Row label="Amount" value={amount} />
          <Row label="Charges" value={charges} />
          <Hr style={cardHr} />
          <Text style={totalText}>
            <span style={rowLabel}>TOTAL PAID:</span>{' '}
            <span style={totalValue}>{total}</span>
          </Text>
          <Hr style={cardHr} />
          <Row label="Payment Method" value={paymentMethod} />
          <Row label="Transaction ID" value={transactionId} />
          <Row label="Processed By" value={processedBy} />
        </Section>

        {pdfUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={pdfUrl} style={button}>
              Download PDF Receipt
            </Button>
            <Text style={smallMuted}>
              Or open this link: <a href={pdfUrl} style={linkStyle}>{pdfUrl}</a>
            </Text>
          </Section>
        )}

        <Text style={text}>
          The PDF is digitally signed by Mukobi Godwin, Finance Manager. Please retain it for your records.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} — Automated System Notification</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReceiptEmail,
  subject: (data: Record<string, any>) =>
    `Payment Receipt ${data.reference || ''}${data.total ? ` — ${data.total}` : ''}`.trim(),
  displayName: 'Payment Receipt',
  previewData: {
    recipientName: 'Timothy',
    reference: 'RCP-20260512-FTQJT',
    description: 'purchasing stationary items for the offices.',
    amount: 'UGX 207,000',
    charges: 'UGX 1,300',
    total: 'UGX 208,300',
    paymentMethod: 'Mobile Money',
    transactionId: '6fb1b5d3-fe20-4e94-b6e2-0ee8c2468806',
    processedBy: 'Musema Wyclif',
    pdfUrl: 'https://example.com/receipt.pdf',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1c5032', margin: '0 0 6px' }
const refBadge = { fontSize: '13px', color: '#1c5032', fontWeight: 'bold' as const, margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0 0 10px' }
const card = { backgroundColor: '#f7faf8', border: '1px solid #e2ece6', borderRadius: '8px', padding: '16px 18px', margin: '14px 0' }
const rowText = { fontSize: '14px', color: '#222', margin: '4px 0', lineHeight: '1.5' }
const rowLabel = { color: '#6b7a72', fontWeight: 'bold' as const }
const rowValue = { color: '#111', wordBreak: 'break-all' as const }
const cardHr = { borderColor: '#e2ece6', margin: '10px 0' }
const totalText = { fontSize: '16px', margin: '6px 0' }
const totalValue = { color: '#1c5032', fontWeight: 'bold' as const, fontSize: '18px' }
const button = {
  backgroundColor: '#1c5032',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const smallMuted = { fontSize: '11px', color: '#888', margin: '10px 0 0', wordBreak: 'break-all' as const }
const linkStyle = { color: '#1c5032' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
