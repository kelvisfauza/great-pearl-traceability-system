import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface Voter {
  name?: string
  email?: string
  vote_type?: string
  reason?: string
  counter_amount?: number | null
  counter_term_months?: number | null
}

interface Props {
  employeeName?: string
  requestedAmount?: string
  systemOfferedAmount?: string
  finalAmount?: string
  finalTermMonths?: string
  decision?: string
  voters?: Voter[]
}

const fmtVote = (v: Voter) => {
  if (v.vote_type === 'approve_full') return 'Approve the full requested amount'
  if (v.vote_type === 'counter') return `Counter-offer UGX ${Number(v.counter_amount || 0).toLocaleString()} for ${v.counter_term_months || 0} month(s)`
  return v.vote_type || ''
}

const Email = ({
  employeeName = 'Employee',
  requestedAmount = '0',
  systemOfferedAmount = '0',
  finalAmount = '0',
  finalTermMonths = '0',
  decision = 'approve_full',
  voters = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your loan appeal was upheld by the admin panel — UGX {finalAmount} approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Loan Appeal Approved</Heading>
          <Text style={subtitle}>{SITE_NAME} — Decision motivated by the admin panel</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>Dear {employeeName},</Text>
          <Text style={bodyText}>
            Your loan appeal has been reviewed and approved by the {SITE_NAME} administration panel.
            This decision was <strong>motivated by admins</strong> after independently re-examining your
            evaluation report, your justification, and your account history. The system's original
            offer has been overridden.
          </Text>

          <Section style={summaryCard}>
            <Text style={cardTitle}>APPEAL OUTCOME</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tbody>
                <tr><td style={labelCell}>You requested:</td><td style={valueCell}>UGX {requestedAmount}</td></tr>
                <tr><td style={labelCell}>System originally offered:</td><td style={valueCell}>UGX {systemOfferedAmount}</td></tr>
                <tr><td style={labelCell}>Admin decision:</td><td style={valueCell}>{decision === 'counter' ? 'Counter-offer' : 'Approve in full'}</td></tr>
                <tr><td style={labelCell}>Final amount approved:</td><td style={valueCellBold}>UGX {finalAmount}</td></tr>
                <tr><td style={labelCell}>Term:</td><td style={valueCell}>{finalTermMonths} month(s)</td></tr>
              </tbody>
            </table>
          </Section>

          <Section style={summaryCard}>
            <Text style={cardTitle}>ADMINS WHO MOTIVATED THIS DECISION</Text>
            <Hr style={cardDivider} />
            <Text style={bodyText}>
              Three administrators independently reviewed your appeal and reached the same decision.
              Their names and the reasons they recorded are listed below:
            </Text>
            {voters.map((v, i) => (
              <Section key={i} style={voterBlock}>
                <Text style={voterName}>{i + 1}. {v.name || v.email || 'Administrator'}</Text>
                <Text style={voterMeta}>{fmtVote(v)}</Text>
                <Text style={voterReason}>"{v.reason || ''}"</Text>
              </Section>
            ))}
          </Section>

          <Text style={bodyText}>
            The approved loan has been automatically created and disbursed to your wallet. You will receive
            a separate loan agreement email with the full repayment schedule.
          </Text>

          <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Loan Appeal Approved by Admin Panel',
  displayName: 'Loan Appeal Approved',
  previewData: {
    employeeName: 'Jane Doe',
    requestedAmount: '2,000,000',
    systemOfferedAmount: '800,000',
    finalAmount: '2,000,000',
    finalTermMonths: '6',
    decision: 'approve_full',
    voters: [
      { name: 'Admin A', vote_type: 'approve_full', reason: 'Strong attendance and 12 months tenure.' },
      { name: 'Admin B', vote_type: 'approve_full', reason: 'Consistent monthly wallet activity.' },
      { name: 'Admin C', vote_type: 'approve_full', reason: 'No prior defaults.' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '640px', margin: '0 auto', padding: '20px' }
const header = { textAlign: 'center' as const, padding: '16px 0' }
const h1 = { fontSize: '24px', color: '#0f5132', margin: '0' }
const subtitle = { fontSize: '13px', color: '#6b7280', margin: '6px 0 0' }
const content = { padding: '12px 0' }
const greeting = { fontSize: '15px', margin: '8px 0' }
const bodyText = { fontSize: '14px', lineHeight: '1.6', color: '#111827', margin: '8px 0' }
const summaryCard = { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', margin: '14px 0' }
const cardTitle = { fontSize: '12px', fontWeight: 'bold' as const, color: '#374151', letterSpacing: '0.5px', margin: '0' }
const cardDivider = { borderTop: '1px solid #e5e7eb', margin: '8px 0' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }
const labelCell = { padding: '4px 0', color: '#6b7280', width: '55%' }
const valueCell = { padding: '4px 0', color: '#111827' }
const valueCellBold = { padding: '4px 0', color: '#0f5132', fontWeight: 'bold' as const }
const voterBlock = { borderLeft: '3px solid #10b981', backgroundColor: '#ffffff', padding: '8px 12px', margin: '8px 0', borderRadius: '4px' }
const voterName = { fontSize: '13px', fontWeight: 'bold' as const, color: '#111827', margin: '0' }
const voterMeta = { fontSize: '12px', color: '#374151', margin: '2px 0' }
const voterReason = { fontSize: '13px', fontStyle: 'italic' as const, color: '#4b5563', margin: '4px 0 0' }
const footer = { fontSize: '11px', color: '#9ca3af', textAlign: 'center' as const, marginTop: '20px' }