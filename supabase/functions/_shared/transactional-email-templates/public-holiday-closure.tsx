/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface PublicHolidayClosureProps { name?: string }

const PublicHolidayClosureEmail = ({ name }: PublicHolidayClosureProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Tomorrow is a public holiday — offices closed, trade team on market watch</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="56" height="56" style={{ margin: '0 auto 10px' }} />
          <Text style={kicker}>PUBLIC HOLIDAY · TOMORROW</Text>
          <Heading style={h1}>OFFICES CLOSED</Heading>
          <Text style={subhead}>Enjoy a well-deserved day off</Text>
        </Section>

        <Section style={greetingSection}>
          <Text style={greeting}>Dear {name || 'Team'},</Text>
          <Text style={bodyText}>
            Please be informed that <strong>tomorrow has been declared a public
            holiday</strong>. In observance of this, <strong>Great Agro Coffee
            offices will remain closed</strong> and there will be no regular
            work activities at our premises.
          </Text>
          <Text style={bodyText}>
            Take this opportunity to rest, recharge, and spend quality time
            with your loved ones. We appreciate the hard work you bring every
            day, and this break is well earned.
          </Text>
        </Section>

        <Section style={tradeCard}>
          <Text style={tradeLabel}>TRADE TEAM NOTICE</Text>
          <Heading style={tradeTitle}>Markets Never Sleep ☕📈</Heading>
          <Text style={tradeBody}>
            While the offices are closed, the <strong>Trade Team is kindly
            requested to keep a close eye on the global coffee markets</strong>.
            Please continue to:
          </Text>
          <Text style={bullet}>• Monitor ICE Arabica & Robusta futures throughout the day</Text>
          <Text style={bullet}>• Track FX movements (USD/UGX) and key benchmarks</Text>
          <Text style={bullet}>• Capture any major price swings or market-moving news</Text>
          <Text style={bullet}>• Submit your daily market report as usual</Text>
        </Section>

        <Hr style={divider} />

        <Section style={greetingSection}>
          <Text style={bodyText}>
            For everyone else — enjoy the day. Regular operations will resume
            the following working day. Stay safe and have a wonderful holiday.
          </Text>
          <Text style={signOff}>Warm regards,</Text>
          <Text style={signName}>Great Agro Coffee Management</Text>
          <Text style={signLocation}>🌿 Kasese, Uganda</Text>
        </Section>

        <Text style={footer}>
          Great Agro Coffee — Kasese, Uganda · +256 393 001 626 · info@greatpearlcoffee.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PublicHolidayClosureEmail,
  subject: '🌿 Public Holiday Tomorrow — Offices Closed | Trade Team: Stay on the Markets',
  displayName: 'Public Holiday Closure',
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
  fontSize: '34px', fontWeight: 'bold' as const, color: '#ffffff',
  margin: '0 0 6px', textAlign: 'center' as const, letterSpacing: '2px',
}
const subhead = {
  fontSize: '15px', color: '#d1fae5', margin: '0',
  textAlign: 'center' as const, fontWeight: '500' as const,
}

const greetingSection = { padding: '24px 28px 0' }
const greeting = { fontSize: '17px', color: '#1e293b', fontWeight: '600' as const, margin: '0 0 14px' }
const bodyText = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }

const tradeCard = {
  margin: '20px 28px',
  padding: '22px 20px',
  backgroundColor: '#ecfdf5',
  borderRadius: '14px',
  borderLeft: '4px solid #047857',
}
const tradeLabel = {
  fontSize: '11px', color: '#047857', letterSpacing: '3px',
  fontWeight: '700' as const, margin: '0 0 6px',
}
const tradeTitle = {
  fontSize: '18px', color: '#064e3b', fontWeight: 'bold' as const, margin: '0 0 10px',
}
const tradeBody = { fontSize: '14px', color: '#065f46', lineHeight: '1.6', margin: '0 0 10px' }
const bullet = { fontSize: '14px', color: '#065f46', lineHeight: '1.8', margin: '0', paddingLeft: '4px' }

const divider = { borderColor: '#e2e8f0', margin: '8px 28px' }
const signOff = { fontSize: '14px', color: '#64748b', margin: '12px 0 4px', fontStyle: 'italic' as const }
const signName = { fontSize: '16px', fontWeight: 'bold' as const, color: '#047857', margin: '0 0 2px' }
const signLocation = { fontSize: '13px', color: '#94a3b8', margin: '0' }
const footer = {
  fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const,
  padding: '12px 28px 20px', margin: '0',
}