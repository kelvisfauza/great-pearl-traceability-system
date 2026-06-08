/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props { name?: string }

const Email = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Tomorrow is Labour Day — observed as a public holiday for all staff</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="56" height="56" style={{ margin: '0 auto 10px' }} />
          <Text style={kicker}>TUESDAY · 9TH JUNE 2026</Text>
          <Heading style={h1}>LABOUR DAY</Heading>
          <Text style={subhead}>Observed as a Public Holiday for All Staff</Text>
        </Section>

        <Section style={greetingSection}>
          <Text style={greeting}>Dear {name || 'Team'},</Text>
          <Text style={bodyText}>
            Please be informed that <strong>tomorrow is Labour Day</strong> and
            will be <strong>observed as a public holiday across all departments
            of Great Agro Coffee</strong>. Our offices, stores and field operations
            will be closed for the day.
          </Text>
          <Text style={bodyText}>
            Take this well-deserved break to rest and spend time with family
            and loved ones. We deeply appreciate the dedication you bring to
            this company every single day.
          </Text>
        </Section>

        <Section style={noticeCard}>
          <Text style={noticeLabel}>WHAT TO EXPECT</Text>
          <Text style={bullet}>• All offices and stores will be closed the entire day</Text>
          <Text style={bullet}>• No field collections, deliveries or processing</Text>
          <Text style={bullet}>• Regular operations resume the following working day</Text>
          <Text style={bullet}>• Trade & Market desk on standby for global market watch</Text>
        </Section>

        <Hr style={divider} />

        <Section style={greetingSection}>
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
  component: Email,
  subject: 'Labour Day Tomorrow — Public Holiday Observed for All Staff',
  displayName: 'Labour Day Closure — Employees',
  previewData: { name: 'Team' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }
const banner = {
  background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #b45309 100%)',
  padding: '36px 28px 28px', textAlign: 'center' as const, borderRadius: '0 0 24px 24px',
}
const kicker = { fontSize: '12px', color: '#fde68a', letterSpacing: '3px', fontWeight: '700' as const, margin: '0 0 6px', textAlign: 'center' as const }
const h1 = { fontSize: '34px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 6px', textAlign: 'center' as const, letterSpacing: '2px' }
const subhead = { fontSize: '15px', color: '#d1fae5', margin: '0', textAlign: 'center' as const, fontWeight: '500' as const }
const greetingSection = { padding: '24px 28px 0' }
const greeting = { fontSize: '17px', color: '#1e293b', fontWeight: '600' as const, margin: '0 0 14px' }
const bodyText = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const noticeCard = { margin: '20px 28px', padding: '22px 20px', backgroundColor: '#ecfdf5', borderRadius: '14px', borderLeft: '4px solid #047857' }
const noticeLabel = { fontSize: '11px', color: '#047857', letterSpacing: '3px', fontWeight: '700' as const, margin: '0 0 10px' }
const bullet = { fontSize: '14px', color: '#065f46', lineHeight: '1.8', margin: '0' }
const divider = { borderColor: '#e2e8f0', margin: '8px 28px' }
const signOff = { fontSize: '14px', color: '#64748b', margin: '0 0 4px', fontStyle: 'italic' as const }
const signName = { fontSize: '16px', fontWeight: 'bold' as const, color: '#047857', margin: '0 0 2px' }
const signLocation = { fontSize: '13px', color: '#94a3b8', margin: '0' }
const footer = { fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const, padding: '12px 28px 20px', margin: '0' }