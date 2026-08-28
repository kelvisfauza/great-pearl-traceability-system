/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface GovernmentCleaningDelayProps {
  name?: string
  date?: string
  reportingTime?: string
}

const GovernmentCleaningDelayEmail = ({
  name,
  date = 'Saturday, 29 August 2026',
  reportingTime = '11:00 AM',
}: GovernmentCleaningDelayProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reporting time delayed to {reportingTime} tomorrow — Government cleaning directive</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="56" height="56" style={{ margin: '0 auto 10px' }} />
          <Text style={kicker}>GOVERNMENT DIRECTIVE · TOMORROW</Text>
          <Heading style={h1}>REPORTING TIME DELAYED</Heading>
          <Text style={subhead}>Please report at {reportingTime} on {date}</Text>
        </Section>

        <Section style={greetingSection}>
          <Text style={greeting}>Dear {name || 'Team Member'},</Text>
          <Text style={bodyText}>
            In accordance with the government directive for a nationwide cleaning
            exercise, <strong>reporting time for all employees has been delayed</strong>.
          </Text>
          <Text style={bodyText}>
            Please note the following important arrangement for tomorrow:
          </Text>
        </Section>

        <Section style={detailCard}>
          <Text style={detailLabel}>NEW REPORTING TIME</Text>
          <Heading style={detailValue}>{reportingTime}</Heading>
          <Text style={detailMeta}>{date}</Text>
          <Hr style={innerDivider} />
          <Text style={detailNote}>
            All staff are expected to be at their respective duty stations by
            {reportingTime}. The morning hours before this time are reserved for
            the national cleaning exercise.
          </Text>
        </Section>

        <Section style={reminderCard}>
          <Text style={reminderLabel}>IMPORTANT REMINDERS</Text>
          <Text style={bullet}>• Reporting time is now {reportingTime}, not the usual time.</Text>
          <Text style={bullet}>• Come prepared for normal work operations after the cleaning exercise.</Text>
          <Text style={bullet}>• Failure to report on time will attract undertime penalties as per HR policy.</Text>
          <Text style={bullet}>• If you are unable to report, please notify your supervisor in advance.</Text>
        </Section>

        <Hr style={divider} />

        <Section style={greetingSection}>
          <Text style={bodyText}>
            Let us all participate responsibly in the cleaning exercise and
            resume our duties promptly. Thank you for your cooperation and
            commitment to keeping our community and workplace clean.
          </Text>
          <Text style={signOff}>Warm regards,</Text>
          <Text style={signName}>Great Agro Coffee Management</Text>
          <Text style={signLocation}>Kasese, Uganda</Text>
        </Section>

        <Text style={footer}>
          Great Agro Coffee — a member of YEDA COFFEE COMPANY LIMITED · P.O Box 431420, Kasese, Uganda · +256 393 001 626 / +256 393 101 103 · operations@greatpearlcoffee.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GovernmentCleaningDelayEmail,
  subject: 'Reporting time delayed to 11:00 AM tomorrow — Government cleaning directive',
  displayName: 'Government cleaning delay announcement',
  previewData: { name: 'Timothy', date: 'Saturday, 29 August 2026', reportingTime: '11:00 AM' },
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

const detailCard = {
  margin: '20px 28px',
  padding: '26px 24px',
  backgroundColor: '#ecfdf5',
  borderRadius: '14px',
  borderLeft: '4px solid #047857',
  textAlign: 'center' as const,
}
const detailLabel = {
  fontSize: '11px', color: '#047857', letterSpacing: '3px',
  fontWeight: '700' as const, margin: '0 0 8px', textAlign: 'center' as const,
}
const detailValue = {
  fontSize: '42px', fontWeight: 'bold' as const, color: '#064e3b',
  margin: '0 0 4px', textAlign: 'center' as const,
}
const detailMeta = {
  fontSize: '15px', color: '#065f46', fontWeight: '600' as const,
  margin: '0 0 16px', textAlign: 'center' as const,
}
const innerDivider = { borderColor: '#a7f3d0', margin: '16px 0' }
const detailNote = {
  fontSize: '14px', color: '#065f46', lineHeight: '1.6', margin: '0',
  textAlign: 'center' as const,
}

const reminderCard = {
  margin: '0 28px 20px',
  padding: '22px 20px',
  backgroundColor: '#fffbeb',
  borderRadius: '14px',
  borderLeft: '4px solid #d97706',
}
const reminderLabel = {
  fontSize: '11px', color: '#b45309', letterSpacing: '3px',
  fontWeight: '700' as const, margin: '0 0 10px',
}
const bullet = { fontSize: '14px', color: '#92400e', lineHeight: '1.8', margin: '0', paddingLeft: '4px' }

const divider = { borderColor: '#e2e8f0', margin: '8px 28px' }
const signOff = { fontSize: '14px', color: '#64748b', margin: '12px 0 4px', fontStyle: 'italic' as const }
const signName = { fontSize: '16px', fontWeight: 'bold' as const, color: '#047857', margin: '0 0 2px' }
const signLocation = { fontSize: '13px', color: '#94a3b8', margin: '0' }
const footer = {
  fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const,
  padding: '12px 28px 20px', margin: '0',
}
