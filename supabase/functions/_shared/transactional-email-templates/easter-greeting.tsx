/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Img,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface EasterGreetingProps {
  name?: string
  year?: number
}

const EasterGreetingEmail = ({ name, year = 2026 }: EasterGreetingProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🐣 Happy Easter from Great Agro Coffee! Wishing you joy, peace & blessings</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Easter Banner */}
        <Section style={banner}>
          <Text style={emojiRow}>🌸 🐣 ✝️ 🐣 🌸</Text>
          <Heading style={h1}>Happy Easter!</Heading>
          <Text style={yearText}>{year}</Text>
        </Section>

        {/* Greeting */}
        <Section style={greetingSection}>
          <Text style={greeting}>
            Dear {name || 'Valued Team Member'},
          </Text>

          <Text style={bodyText}>
            On behalf of the entire <strong>Great Agro Coffee</strong> family, we wish you
            a blessed and joyful Easter celebration! 🎉
          </Text>

          <Text style={bodyText}>
            Easter reminds us of new beginnings, hope, and the power of faith.
            Just as spring brings new life, may this season fill your heart with
            renewed energy, peace, and abundant blessings for you and your loved ones.
          </Text>
        </Section>

        {/* Decorative Divider */}
        <Section style={dividerSection}>
          <Text style={dividerEmoji}>🌷 🥚 🐰 🥚 🌷</Text>
        </Section>

        {/* Message Cards */}
        <Section style={card1}>
          <Text style={cardEmoji}>✝️</Text>
          <Text style={cardTitle}>Faith & Hope</Text>
          <Text style={cardText}>
            "He is not here; He has risen!" — May the miracle of Easter fill
            your life with faith, hope, and everlasting joy.
          </Text>
        </Section>

        <Section style={card2}>
          <Text style={cardEmoji}>🤝</Text>
          <Text style={cardTitle}>Gratitude</Text>
          <Text style={cardText}>
            We are grateful for your dedication and hard work. Together, we
            continue to grow and build something truly great in the heart of
            Kasese and beyond.
          </Text>
        </Section>

        <Section style={card3}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="40" height="40" style={{ margin: '0 auto 6px' }} />
          <Text style={cardTitle}>Our Coffee Family</Text>
          <Text style={cardText}>
            From the lush hills of the Rwenzori Mountains to every cup we
            produce — our strength lies in our people. Thank you for being
            part of this journey.
          </Text>
        </Section>

        <Hr style={divider} />

        {/* Closing */}
        <Section style={closingSection}>
          <Text style={closingText}>
            May your Easter be filled with love, laughter, and the warmth of
            family. Enjoy the holiday and come back refreshed and ready! 🌟
          </Text>

          <Text style={signOff}>
            With warm wishes,
          </Text>
          <Text style={signName}>
            The Great Agro Coffee Management
          </Text>
          <Text style={signLocation}>
            🌿 Kasese, Uganda
          </Text>
        </Section>

        {/* Bottom Easter Eggs */}
        <Section style={bottomBanner}>
          <Text style={bottomEmoji}>🥚🌸🐣🌺🥚🌸🐣🌺🥚</Text>
        </Section>

        <Text style={footer}>
          Great Agro Coffee — Kasese, Uganda | +256 393 001 626 | info@greatpearlcoffee.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EasterGreetingEmail,
  subject: '🐣 Happy Easter from Great Agro Coffee!',
  displayName: 'Easter greeting',
  previewData: { name: 'Jane', year: 2026 },
} satisfies TemplateEntry

// — Styles —
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }

const banner = {
  background: 'linear-gradient(135deg, #fce7f3 0%, #e9d5ff 50%, #dbeafe 100%)',
  padding: '40px 28px 30px',
  textAlign: 'center' as const,
  borderRadius: '0 0 24px 24px',
}
const emojiRow = {
  fontSize: '32px',
  margin: '0 0 8px',
  letterSpacing: '8px',
}
const h1 = {
  fontSize: '36px',
  fontWeight: 'bold' as const,
  color: '#6b21a8',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}
const yearText = {
  fontSize: '16px',
  color: '#9333ea',
  fontWeight: '500' as const,
  margin: '0',
  textAlign: 'center' as const,
}

const greetingSection = { padding: '28px 28px 0' }
const greeting = {
  fontSize: '18px',
  color: '#1e293b',
  fontWeight: '600' as const,
  margin: '0 0 16px',
}
const bodyText = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.7',
  margin: '0 0 16px',
}

const dividerSection = { textAlign: 'center' as const, padding: '8px 0' }
const dividerEmoji = {
  fontSize: '24px',
  letterSpacing: '12px',
  margin: '0',
}

const cardBase = {
  padding: '20px 24px',
  borderRadius: '12px',
  margin: '0 28px 12px',
}
const card1 = {
  ...cardBase,
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
}
const card2 = {
  ...cardBase,
  backgroundColor: '#fce7f3',
  borderLeft: '4px solid #ec4899',
}
const card3 = {
  ...cardBase,
  backgroundColor: '#ecfdf5',
  borderLeft: '4px solid #10b981',
}
const cardEmoji = {
  fontSize: '28px',
  margin: '0 0 4px',
}
const cardTitle = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#1e293b',
  margin: '0 0 6px',
}
const cardText = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0',
}

const divider = { borderColor: '#e2e8f0', margin: '24px 28px' }

const closingSection = { padding: '0 28px 16px' }
const closingText = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.7',
  margin: '0 0 20px',
}
const signOff = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0 0 4px',
  fontStyle: 'italic' as const,
}
const signName = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#6b21a8',
  margin: '0 0 2px',
}
const signLocation = {
  fontSize: '13px',
  color: '#94a3b8',
  margin: '0',
}

const bottomBanner = {
  background: 'linear-gradient(135deg, #fce7f3 0%, #e9d5ff 50%, #dbeafe 100%)',
  padding: '16px',
  textAlign: 'center' as const,
  borderRadius: '16px 16px 0 0',
  marginTop: '16px',
}
const bottomEmoji = {
  fontSize: '20px',
  letterSpacing: '6px',
  margin: '0',
}

const footer = {
  fontSize: '11px',
  color: '#94a3b8',
  textAlign: 'center' as const,
  padding: '12px 28px 20px',
  margin: '0',
}
