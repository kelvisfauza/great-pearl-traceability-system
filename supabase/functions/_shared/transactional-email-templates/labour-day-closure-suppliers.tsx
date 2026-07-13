/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props { supplierName?: string }

const Email = ({ supplierName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Notice: Great Agro Coffee will be closed tomorrow for Labour Day</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="56" height="56" style={{ margin: '0 auto 10px' }} />
          <Text style={kicker}>SUPPLIER NOTICE</Text>
          <Heading style={h1}>WE ARE CLOSED TOMORROW</Heading>
          <Text style={subhead}>Labour Day · Public Holiday</Text>
        </Section>

        <Section style={greetingSection}>
          <Text style={greeting}>Dear {supplierName || 'Valued Supplier'},</Text>
          <Text style={bodyText}>
            We would like to kindly inform you that <strong>Great Agro Coffee
            will be closed tomorrow</strong> in observance of <strong>Labour Day</strong>,
            a public holiday.
          </Text>
          <Text style={bodyText}>
            On this day we will <strong>not be receiving coffee deliveries</strong>,
            issuing payments, or carrying out any field operations at our stores.
            We kindly request that you plan any planned deliveries or visits
            around this closure.
          </Text>
        </Section>

        <Section style={noticeCard}>
          <Text style={noticeLabel}>PLEASE NOTE</Text>
          <Text style={bullet}>• All stores and offices closed the entire day</Text>
          <Text style={bullet}>• No coffee intake, weighing or grading</Text>
          <Text style={bullet}>• No supplier payments processed</Text>
          <Text style={bullet}>• Normal operations resume the next working day</Text>
        </Section>

        <Hr style={divider} />

        <Section style={greetingSection}>
          <Text style={bodyText}>
            We sincerely appreciate your continued partnership and thank you
            for your understanding. For any urgent enquiries, please reach
            out to our team on the next working day.
          </Text>
          <Text style={signOff}>Warm regards,</Text>
          <Text style={signName}>Great Agro Coffee Management</Text>
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
  component: Email,
  subject: 'Notice: Great Agro Coffee Closed Tomorrow — Labour Day Public Holiday',
  displayName: 'Labour Day Closure — Suppliers',
  previewData: { supplierName: 'Supplier' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }
const banner = {
  background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #b45309 100%)',
  padding: '36px 28px 28px', textAlign: 'center' as const, borderRadius: '0 0 24px 24px',
}
const kicker = { fontSize: '12px', color: '#fde68a', letterSpacing: '3px', fontWeight: '700' as const, margin: '0 0 6px', textAlign: 'center' as const }
const h1 = { fontSize: '28px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 6px', textAlign: 'center' as const, letterSpacing: '1px' }
const subhead = { fontSize: '15px', color: '#d1fae5', margin: '0', textAlign: 'center' as const, fontWeight: '500' as const }
const greetingSection = { padding: '24px 28px 0' }
const greeting = { fontSize: '17px', color: '#1e293b', fontWeight: '600' as const, margin: '0 0 14px' }
const bodyText = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 14px' }
const noticeCard = { margin: '20px 28px', padding: '22px 20px', backgroundColor: '#fef3c7', borderRadius: '14px', borderLeft: '4px solid #b45309' }
const noticeLabel = { fontSize: '11px', color: '#92400e', letterSpacing: '3px', fontWeight: '700' as const, margin: '0 0 10px' }
const bullet = { fontSize: '14px', color: '#78350f', lineHeight: '1.8', margin: '0' }
const divider = { borderColor: '#e2e8f0', margin: '8px 28px' }
const signOff = { fontSize: '14px', color: '#64748b', margin: '12px 0 4px', fontStyle: 'italic' as const }
const signName = { fontSize: '16px', fontWeight: 'bold' as const, color: '#047857', margin: '0 0 2px' }
const signLocation = { fontSize: '13px', color: '#94a3b8', margin: '0' }
const footer = { fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const, padding: '12px 28px 20px', margin: '0' }