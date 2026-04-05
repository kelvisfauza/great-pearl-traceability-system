import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface TransactionStatementProps {
  employeeName?: string
  periodFrom?: string
  periodTo?: string
  currentBalance?: number
  statementFee?: number
  pdfDownloadUrl?: string
  transactions?: Array<{
    date: string
    type: string
    description: string
    amount: number
    balance: number | null
  }>
}

const TransactionStatementEmail = ({
  employeeName = 'Employee',
  periodFrom = '',
  periodTo = '',
  currentBalance = 0,
  statementFee = 500,
  pdfDownloadUrl = '',
  transactions = [],
}: TransactionStatementProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your transaction statement from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{SITE_NAME}</Heading>
        <Text style={subtitle}>Transaction Statement</Text>
        <Hr style={hr} />
        
        <Text style={text}>
          <strong>Employee:</strong> {employeeName}<br />
          <strong>Period:</strong> {periodFrom} — {periodTo}<br />
          <strong>Current Balance:</strong> UGX {(currentBalance || 0).toLocaleString()}<br />
          <strong>Statement Charge:</strong> UGX {(statementFee || 500).toLocaleString()}
        </Text>

        {pdfDownloadUrl ? (
          <Section style={{ margin: '16px 0', textAlign: 'center' as const }}>
            <Button style={downloadBtn} href={pdfDownloadUrl}>
              📄 Download PDF Statement
            </Button>
            <Text style={{ fontSize: '11px', color: '#888', margin: '8px 0 0' }}>
              Your detailed statement is attached as a PDF for your records.
            </Text>
          </Section>
        ) : null}

        <Text style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' as const, margin: '16px 0 8px' }}>
          Transaction Summary ({transactions.length} records)
        </Text>

        <Section style={tableContainer}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Type</th>
                <th style={th}>Description</th>
                <th style={{ ...th, textAlign: 'right' as const }}>Amount</th>
                <th style={{ ...th, textAlign: 'right' as const }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={i}>
                  <td style={td}>{tx.date}</td>
                  <td style={td}>{tx.type}</td>
                  <td style={td}>{tx.description}</td>
                  <td style={{ ...td, textAlign: 'right' as const, color: tx.amount >= 0 ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </td>
                  <td style={{ ...td, textAlign: 'right' as const, fontWeight: 600 }}>
                    {tx.balance != null ? tx.balance.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          This statement was generated on {new Date().toLocaleDateString()}. For questions, contact operations@greatpearlcoffee.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TransactionStatementEmail,
  subject: (data: Record<string, any>) => `Transaction Statement: ${data.periodFrom || ''} — ${data.periodTo || ''}`,
  displayName: 'Transaction Statement',
  previewData: {
    employeeName: 'Jane Doe',
    periodFrom: 'Jan 01, 2026',
    periodTo: 'Jan 31, 2026',
    currentBalance: 150000,
    statementFee: 500,
    pdfDownloadUrl: 'https://example.com/statement.pdf',
    transactions: [
      { date: 'Jan 05', type: '💵 Salary Credit', description: 'Salary', amount: 500000, balance: 650000 },
      { date: 'Jan 10', type: '📤 Sent Money', description: 'to John Doe', amount: -100000, balance: 550000 },
      { date: 'Jan 31', type: '📄 Transaction Charge', description: 'Statement Charge', amount: -500, balance: 549500 },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '700px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a5632', margin: '0 0 4px' }
const subtitle = { fontSize: '16px', color: '#555', margin: '0 0 16px' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6' }
const footer = { fontSize: '12px', color: '#999', margin: '20px 0 0' }
const tableContainer = { margin: '16px 0' }
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' }
const th = { textAlign: 'left' as const, padding: '8px 6px', borderBottom: '2px solid #333', fontSize: '11px', color: '#333' }
const td = { padding: '6px', borderBottom: '1px solid #eee', fontSize: '12px', color: '#333' }
const downloadBtn = {
  backgroundColor: '#1a5632',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
