/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

const DEFAULT_POSTER_URL = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/happy-eid-poster.jpg'
const DEFAULT_PDF_URL = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/happy-eid-poster.pdf'

interface HappyEidProps { name?: string; image_url?: string; pdf_url?: string }

const HappyEidEmail = ({ name, image_url, pdf_url }: HappyEidProps) => {
  const POSTER_URL = image_url || DEFAULT_POSTER_URL
  const PDF_URL = pdf_url || DEFAULT_PDF_URL
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Eid Mubarak from the Great Agro Coffee family — download & share your poster</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Text style={kicker}>EID AL-ADHA · 2026</Text>
          <Heading style={h1}>Eid Mubarak</Heading>
          <Text style={subhead}>Peace, blessings & a joyful celebration</Text>
        </Section>

        <Section style={greetingSection}>
          <Text style={greeting}>Dear {name || 'Team'},</Text>
          <Text style={bodyText}>
            On behalf of the entire <strong>{SITE_NAME}</strong> family, we wish
            you and your loved ones a blessed and joyous <strong>Eid</strong>.
            May this special day bring peace, prosperity and happiness to your
            home.
          </Text>
        </Section>

        <Section style={posterWrap}>
          <Img src={POSTER_URL} alt="Happy Eid Mubarak" width="540" style={posterImg} />
        </Section>

        <Section style={ctaSection}>
          <Text style={ctaHint}>📲 Download & share on your WhatsApp status</Text>
          <Button href={PDF_URL} style={btnGold}>Download PDF</Button>
          <div style={{ height: 10 }} />
          <Button href={POSTER_URL} style={btnGreen}>Download Image</Button>
        </Section>

        <Hr style={divider} />

        <Section style={closingSection}>
          <Text style={closingText}>
            Eid Mubarak from all of us. Enjoy the celebrations with family
            and friends. 🌙
          </Text>
          <Text style={signOff}>Warm regards,</Text>
          <Text style={signName}>The Great Agro Coffee Management</Text>
          <Text style={signLocation}>Kasese, Uganda</Text>
        </Section>

        <Text style={footer}>
          Great Agro Coffee — Kasese, Uganda · +256 393 001 626 · operations@greatpearlcoffee.com
        </Text>
      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: HappyEidEmail,
  subject: 'Eid Mubarak from the Great Agro Coffee Family 🌙',
  displayName: 'Happy Eid Greeting',
  previewData: { name: 'Timothy' },
} satisfies TemplateEntry

const main = { backgroundColor: '#f8fafc', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }
const banner = {
  background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #b45309 100%)',
  padding: '36px 28px 28px', textAlign: 'center' as const,
}
const kicker = { fontSize: '12px', color: '#fde68a', letterSpacing: '3px', fontWeight: '700' as const, margin: '0 0 6px' }
const h1 = { fontSize: '42px', fontWeight: 'bold' as const, color: '#fef3c7', margin: '0 0 6px', letterSpacing: '1px' }
const subhead = { fontSize: '15px', color: '#d1fae5', margin: '0', fontWeight: '500' as const }
const greetingSection = { padding: '24px 28px 0' }
const greeting = { fontSize: '17px', color: '#1e293b', fontWeight: '600' as const, margin: '0 0 14px' }
const bodyText = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const posterWrap = { padding: '12px 28px', textAlign: 'center' as const }
const posterImg = { width: '100%', maxWidth: '540px', height: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }
const ctaSection = { padding: '8px 28px 24px', textAlign: 'center' as const }
const ctaHint = { fontSize: '13px', color: '#64748b', margin: '0 0 12px' }
const btnGold = { backgroundColor: '#b45309', color: '#fff', padding: '12px 26px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '14px', display: 'inline-block' }
const btnGreen = { backgroundColor: '#047857', color: '#fff', padding: '12px 26px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '14px', display: 'inline-block' }
const divider = { borderColor: '#e2e8f0', margin: '8px 28px' }
const closingSection = { padding: '0 28px 16px' }
const closingText = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 18px' }
const signOff = { fontSize: '14px', color: '#64748b', margin: '0 0 4px', fontStyle: 'italic' as const }
const signName = { fontSize: '16px', fontWeight: 'bold' as const, color: '#047857', margin: '0 0 2px' }
const signLocation = { fontSize: '13px', color: '#94a3b8', margin: '0' }
const footer = { fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const, padding: '12px 28px 20px', margin: '0' }