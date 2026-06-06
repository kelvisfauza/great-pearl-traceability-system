import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  outstanding?: string
  daysOutstanding?: string
  projectedPenaltyToday?: string
  projectedIn3Days?: string
  isTest?: boolean
}

const OverdraftPenaltyWarning = ({
  employeeName = 'there',
  outstanding = '0',
  daysOutstanding = '6',
  projectedPenaltyToday = '0',
  projectedIn3Days = '0',
  isTest = false,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your overdraft has entered the penalty zone — 10% daily interest now applies</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="56" height="56" style={{ margin: '0 auto 8px' }} />
          <Heading style={h1}>Overdraft Penalty Notice</Heading>
          <Text style={subtitle}>Day {daysOutstanding} outstanding — penalty interest now active</Text>
        </Section>
        <Section style={content}>
          {isTest && (
            <Section style={testBanner}>
              <Text style={testText}>This is a TEST preview. No real penalty has been applied.</Text>
            </Section>
          )}
          <Text style={greeting}>Dear {employeeName},</Text>
          <Text style={bodyText}>
            Your overdraft has now been outstanding for <strong>{daysOutstanding} days</strong>. As of today, the
            standard daily interest no longer applies — your account has entered the <strong>penalty zone</strong>,
            where interest accrues at <strong>10% per day</strong> on the full outstanding balance until cleared.
          </Text>

          <Section style={summaryCard}>
            <Text style={cardTitle}>CURRENT POSITION</Text>
            <Hr style={cardDivider} />
            <Text style={rowText}>Outstanding balance: <strong>UGX {outstanding}</strong></Text>
            <Text style={rowText}>Days outstanding: <strong>{daysOutstanding}</strong></Text>
            <Text style={rowText}>Penalty rate: <strong>10% per day</strong> (compounding)</Text>
          </Section>

          <Section style={penaltyCard}>
            <Text style={cardTitlePenalty}>PROJECTED COST IF NOT CLEARED</Text>
            <Hr style={cardDividerPenalty} />
            <Text style={rowText}>Penalty added today: <strong>UGX {projectedPenaltyToday}</strong></Text>
            <Text style={rowText}>Total added over next 3 days: <strong>UGX {projectedIn3Days}</strong></Text>
            <Text style={smallNote}>
              Penalty interest is deducted from your wallet daily and added to your outstanding balance.
              If still unpaid by day 30, the overdraft is automatically frozen.
            </Text>
          </Section>

          <Text style={bodyText}>
            <strong>To stop the penalty:</strong> repay the outstanding balance (or any portion) from your
            wallet, salary, or mobile money. Any incoming credit — salary, loyalty, deposits — is applied
            to clear your overdraft first.
          </Text>

          <Text style={footer}>
            — {SITE_NAME} Finance Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OverdraftPenaltyWarning,
  subject: (data: Record<string, any>) =>
    data.isTest
      ? `[TEST] Overdraft Penalty Notice — Day ${data.daysOutstanding || '6'}`
      : `Overdraft Penalty Notice — Day ${data.daysOutstanding || '6'} (10%/day now applies)`,
  displayName: 'Overdraft penalty warning',
  previewData: {
    employeeName: 'Jane Doe',
    outstanding: '250,000',
    daysOutstanding: '6',
    projectedPenaltyToday: '25,000',
    projectedIn3Days: '82,750',
    isTest: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#b91c1c', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: '0' }
const content = { padding: '25px' }
const testBanner = { backgroundColor: '#fef3c7', borderLeft: '4px solid #d97706', padding: '10px 14px', margin: '0 0 16px', borderRadius: '4px' }
const testText = { fontSize: '12px', color: '#92400e', margin: '0', fontWeight: 'bold' as const }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 18px' }
const summaryCard = { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', margin: '0 0 14px', border: '1px solid #e2e8f0' }
const penaltyCard = { backgroundColor: '#fef2f2', borderRadius: '8px', padding: '16px', margin: '0 0 18px', border: '1px solid #fecaca' }
const cardTitle = { fontSize: '12px', fontWeight: 'bold' as const, color: '#475569', margin: '0 0 6px', letterSpacing: '0.5px' }
const cardTitlePenalty = { fontSize: '12px', fontWeight: 'bold' as const, color: '#991b1b', margin: '0 0 6px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#e2e8f0', margin: '6px 0 10px' }
const cardDividerPenalty = { borderColor: '#fecaca', margin: '6px 0 10px' }
const rowText = { fontSize: '13px', color: '#1f2937', margin: '4px 0', lineHeight: '1.5' }
const smallNote = { fontSize: '12px', color: '#7f1d1d', margin: '10px 0 0', lineHeight: '1.5', fontStyle: 'italic' as const }
const footer = { fontSize: '12px', color: '#666', margin: '24px 0 0' }