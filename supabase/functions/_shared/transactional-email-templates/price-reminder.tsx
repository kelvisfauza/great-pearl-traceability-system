import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface PriceReminderProps {
  analystName?: string
  date?: string
  loginUrl?: string
}

const PriceReminderEmail = ({
  analystName = 'Analyst',
  date = new Date().toLocaleDateString('en-GB'),
  loginUrl = 'https://www.greatagrocoffeesystem.site',
}: PriceReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      ☕ Good morning {analystName}! Please update today's coffee buying prices.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={{ margin: '0 auto 8px' }} />
          <Text style={brandText}>{SITE_NAME}</Text>
        </Section>

        <Section style={heroBanner}>
          <Text style={heroEmoji}>📊</Text>
          <Text style={heroTitle}>Daily Price Reminder</Text>
          <Text style={heroDate}>{date}</Text>
        </Section>

        <Heading style={h1}>Good Morning, {analystName}! ☀️</Heading>

        <Text style={text}>
          Today's coffee buying prices have <strong>not yet been updated</strong> on the system. 
          The purchasing team and field officers depend on accurate, up-to-date prices to operate effectively.
        </Text>

        <Section style={checklist}>
          <Text style={checklistTitle}>📋 What to update:</Text>
          <Hr style={divider} />
          <Text style={checkItem}>✅ Check ICE Arabica & Robusta international prices</Text>
          <Text style={checkItem}>✅ Check current exchange rate (USD/UGX)</Text>
          <Text style={checkItem}>✅ Set local reference prices (Drugar, Wugar, FAQ)</Text>
          <Text style={checkItem}>✅ Set Arabica & Robusta buying prices with quality metrics</Text>
          <Text style={checkItem}>✅ Submit for admin approval</Text>
        </Section>

        <Section style={ctaSection}>
          <Button href={loginUrl} style={ctaButton}>
            Open System & Set Prices
          </Button>
          <Text style={ctaHint}>
            Go to <strong>Data Analyst → Set Prices</strong> after logging in
          </Text>
        </Section>

        <Section style={urgencyBox}>
          <Text style={urgencyText}>
            ⏰ Please update prices as early as possible so the team can start purchasing with the correct rates. 
            Prices should ideally be set before <strong>9:00 AM</strong>.
          </Text>
        </Section>

        <Text style={footer}>
          This is an automated reminder from {SITE_NAME}.<br />
          You will stop receiving this reminder once today's prices are submitted.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PriceReminderEmail,
  subject: (data: Record<string, any>) =>
    `☕ Price Reminder: Please update buying prices for ${data.date || 'today'}`,
  displayName: 'Morning price update reminder',
  previewData: {
    analystName: 'Bwambale Denis',
    date: '05/04/2026',
    loginUrl: 'https://www.greatagrocoffeesystem.site',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#92400e', margin: '0' }
const heroBanner = { backgroundColor: '#1e40af', borderRadius: '12px', padding: '24px 20px', margin: '0 0 20px', textAlign: 'center' as const }
const heroEmoji = { fontSize: '36px', margin: '0 0 8px', color: '#ffffff' }
const heroTitle = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 4px' }
const heroDate = { fontSize: '14px', color: '#93c5fd', margin: '0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '10px 0 16px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const checklist = { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '18px 20px', margin: '0 0 16px', border: '1px solid #e2e8f0' }
const checklistTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#1e40af', margin: '0 0 8px' }
const divider = { borderColor: '#e2e8f0', margin: '10px 0' }
const checkItem = { fontSize: '13px', color: '#334155', margin: '6px 0', lineHeight: '1.5' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const ctaButton = { backgroundColor: '#1e40af', borderRadius: '8px', color: '#ffffff', fontSize: '16px', fontWeight: 'bold' as const, padding: '14px 32px', textDecoration: 'none' }
const ctaHint = { fontSize: '12px', color: '#64748b', margin: '10px 0 0' }
const urgencyBox = { backgroundColor: '#fffbeb', borderRadius: '8px', padding: '14px 16px', margin: '0 0 20px', border: '1px solid #fde68a', borderLeft: '4px solid #d97706' }
const urgencyText = { fontSize: '13px', color: '#92400e', margin: '0', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0', lineHeight: '1.5', borderTop: '1px solid #eee', paddingTop: '16px', textAlign: 'center' as const }
