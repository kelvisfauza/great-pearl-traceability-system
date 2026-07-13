/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface LabourDay2026Props { name?: string }

const LabourDay2026Email = ({ name }: LabourDay2026Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Labour Day 1st May 2026 — We are open all day, UGX 20,000 Per Diem for everyone</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Hero banner */}
        <Section style={banner}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="56" height="56" style={{ margin: '0 auto 10px' }} />
          <Text style={kicker}>FRIDAY · 1ST MAY 2026</Text>
          <Heading style={h1}>LABOUR DAY</Heading>
          <Text style={subhead}>Open for Business — All Day</Text>
        </Section>

        {/* Greeting */}
        <Section style={greetingSection}>
          <Text style={greeting}>Dear {name || 'Team'},</Text>
          <Text style={bodyText}>
            Tomorrow, <strong>1st May 2026</strong>, is Labour Day — a public
            holiday in Uganda. At <strong>Great Agro Coffee</strong>, we will
            be <strong>open for business the entire day</strong> as we honour
            the spirit of work that built this company.
          </Text>
        </Section>

        {/* Per Diem highlight */}
        <Section style={perDiemCard}>
          <Text style={perDiemLabel}>PER DIEM REWARD</Text>
          <Heading style={perDiemAmount}>UGX 20,000</Heading>
          <Text style={perDiemSub}>Per person · Credited to your wallet</Text>
        </Section>

        <Section style={greetingSection}>
          <Text style={bodyText}>
            Every team member who reports for duty tomorrow will receive a
            <strong> UGX 20,000 per diem</strong> as a token of appreciation
            for showing up on this special day.
          </Text>
        </Section>

        <Hr style={divider} />

        {/* USSD card */}
        <Section style={ussdCard}>
          <Text style={ussdEmoji}>📱</Text>
          <Text style={ussdTitle}>Pay Your Loan via USSD</Text>
          <Text style={ussdCode}>*217*563#</Text>
          <Text style={ussdSub}>
            Dial from your registered phone to repay loans, top up your wallet,
            or settle any other service — anytime, anywhere.
          </Text>
        </Section>

        <Section style={greetingSection}>
          <Text style={bodyText}>
            Whether you're at the office or out in the field, you can manage
            your finances on the go. No app needed — just dial the code above.
          </Text>
        </Section>

        <Hr style={divider} />

        {/* Closing */}
        <Section style={closingSection}>
          <Text style={closingText}>
            Thank you for your dedication. Let's make tomorrow productive,
            rewarding, and proudly Great Agro. 💪☕
          </Text>
          <Text style={signOff}>Warm regards,</Text>
          <Text style={signName}>The Great Agro Coffee Management</Text>
          <Text style={signLocation}>🌿 Kasese, Uganda</Text>
        </Section>

        <Text style={footer}>
          Great Agro Coffee — Kasese, Uganda · +256 393 001 626 / +256 393 101 103 · info@greatpearlcoffee.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LabourDay2026Email,
  subject: '🛠️ Labour Day 1st May — We Are Open + UGX 20,000 Per Diem',
  displayName: 'Labour Day 2026 Announcement',
  previewData: { name: 'Timothy' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }

const banner = {
  background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #b45309 100%)',
  padding: '36px 28px 28px',
  textAlign: 'center' as const,
  borderRadius: '0 0 24px 24px',
}
const kicker = {
  fontSize: '12px', color: '#fde68a', letterSpacing: '3px',
  fontWeight: '700' as const, margin: '0 0 6px', textAlign: 'center' as const,
}
const h1 = {
  fontSize: '38px', fontWeight: 'bold' as const, color: '#ffffff',
  margin: '0 0 6px', textAlign: 'center' as const, letterSpacing: '2px',
}
const subhead = {
  fontSize: '15px', color: '#d1fae5', margin: '0',
  textAlign: 'center' as const, fontWeight: '500' as const,
}

const greetingSection = { padding: '24px 28px 0' }
const greeting = { fontSize: '17px', color: '#1e293b', fontWeight: '600' as const, margin: '0 0 14px' }
const bodyText = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }

const perDiemCard = {
  margin: '20px 28px',
  padding: '24px 20px',
  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
  borderRadius: '14px',
  textAlign: 'center' as const,
  border: '2px dashed #b45309',
}
const perDiemLabel = {
  fontSize: '12px', color: '#92400e', letterSpacing: '3px',
  fontWeight: '700' as const, margin: '0 0 4px',
}
const perDiemAmount = {
  fontSize: '40px', color: '#78350f', fontWeight: 'bold' as const,
  margin: '0 0 4px', letterSpacing: '1px',
}
const perDiemSub = { fontSize: '13px', color: '#92400e', margin: '0', fontWeight: '500' as const }

const ussdCard = {
  margin: '20px 28px',
  padding: '24px 20px',
  backgroundColor: '#ecfdf5',
  borderRadius: '14px',
  textAlign: 'center' as const,
  borderLeft: '4px solid #047857',
}
const ussdEmoji = { fontSize: '32px', margin: '0 0 6px' }
const ussdTitle = {
  fontSize: '16px', color: '#064e3b', fontWeight: 'bold' as const, margin: '0 0 10px',
}
const ussdCode = {
  fontSize: '34px', color: '#047857', fontWeight: 'bold' as const,
  letterSpacing: '4px', margin: '0 0 10px', fontFamily: 'monospace',
}
const ussdSub = { fontSize: '13px', color: '#065f46', lineHeight: '1.6', margin: '0' }

const divider = { borderColor: '#e2e8f0', margin: '8px 28px' }
const closingSection = { padding: '0 28px 16px' }
const closingText = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 18px' }
const signOff = { fontSize: '14px', color: '#64748b', margin: '0 0 4px', fontStyle: 'italic' as const }
const signName = { fontSize: '16px', fontWeight: 'bold' as const, color: '#047857', margin: '0 0 2px' }
const signLocation = { fontSize: '13px', color: '#94a3b8', margin: '0' }
const footer = {
  fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const,
  padding: '12px 28px 20px', margin: '0',
}
