import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface NewDeviceAlertProps {
  employeeName?: string
  browser?: string
  os?: string
  loginTime?: string
  verifyUrl?: string
}

const NewDeviceAlertEmail = ({
  employeeName = 'User',
  browser = 'Unknown Browser',
  os = 'Unknown OS',
  loginTime = '',
  verifyUrl = '#',
}: NewDeviceAlertProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🔒 New device login detected — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerBadge}>🔒 SECURITY ALERT</Text>
          <Heading style={h1}>New Device Detected</Heading>
          <Text style={headerSub}>We noticed a login from an unrecognized device</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>Hi {employeeName},</Text>
          <Text style={text}>
            Someone just signed into your {SITE_NAME} account from a new device. 
            If this was you, please verify this device by clicking the button below.
          </Text>

          <Section style={detailsCard}>
            <Text style={detailsTitle}>📱 Device Details</Text>
            <Hr style={thinHr} />
            <Text style={detailRow}><strong>Browser:</strong> {browser}</Text>
            <Text style={detailRow}><strong>Operating System:</strong> {os}</Text>
            <Text style={detailRow}><strong>Time:</strong> {loginTime}</Text>
          </Section>

          <Section style={ctaSection}>
            <Button href={verifyUrl} style={verifyButton}>
              ✅ Verify This Device
            </Button>
          </Section>

          <Section style={warningCard}>
            <Text style={warningTitle}>⚠️ Wasn't you?</Text>
            <Text style={warningText}>
              If you did not perform this login, please change your password immediately 
              and contact your administrator. Your account has been temporarily restricted 
              until this device is verified.
            </Text>
          </Section>

          <Hr style={divider} />
          <Text style={footerNote}>
            This verification link expires in 30 minutes. After verification, this device 
            will be trusted for future logins.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME} — Security System</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewDeviceAlertEmail,
  subject: '🔒 New device login detected — Verify your device',
  displayName: 'New device login alert',
  previewData: {
    employeeName: 'Denis',
    browser: 'Chrome 120',
    os: 'Windows 11',
    loginTime: '2026-04-05 at 5:30 PM EAT',
    verifyUrl: 'https://great-pearl-traceability-system.lovable.app/verify-device?token=abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '580px', margin: '0 auto' }
const header = { backgroundColor: '#dc2626', padding: '30px 25px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const headerBadge = { color: '#fef2f2', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '2px', margin: '0 0 6px' }
const h1 = { color: '#ffffff', fontSize: '24px', fontWeight: '700' as const, margin: '0 0 4px' }
const headerSub = { color: '#fecaca', fontSize: '13px', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#1e293b', fontWeight: '600' as const, margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const detailsCard = { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '16px 20px', border: '1px solid #e2e8f0', margin: '0 0 20px' }
const detailsTitle = { fontSize: '13px', fontWeight: '700' as const, color: '#1e293b', margin: '0 0 8px' }
const thinHr = { borderColor: '#e2e8f0', margin: '8px 0 12px' }
const detailRow = { fontSize: '13px', color: '#334155', margin: '4px 0', lineHeight: '1.5' }
const ctaSection = { textAlign: 'center' as const, margin: '0 0 20px' }
const verifyButton = { backgroundColor: '#16a34a', color: '#ffffff', fontSize: '16px', fontWeight: '700' as const, padding: '14px 48px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
const warningCard = { backgroundColor: '#fef3c7', borderRadius: '10px', padding: '16px 20px', border: '1px solid #fde68a', margin: '0 0 20px' }
const warningTitle = { fontSize: '13px', fontWeight: '700' as const, color: '#92400e', margin: '0 0 6px' }
const warningText = { fontSize: '12px', color: '#78350f', lineHeight: '1.5', margin: '0' }
const divider = { borderColor: '#e2e8f0', margin: '20px 0' }
const footerNote = { fontSize: '11px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 6px' }
const footer = { backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '0 0 12px 12px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#94a3b8', margin: '0' }
