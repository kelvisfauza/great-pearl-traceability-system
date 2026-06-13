import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Great Agro Coffee"

interface GeneralNotificationProps {
  title?: string
  message?: string
  recipientName?: string
  ctaUrl?: string
  ctaLabel?: string
}

const GeneralNotificationEmail = ({ title, message, recipientName, ctaUrl, ctaLabel }: GeneralNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{title || 'System Notification'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{title || 'System Notification'}</Heading>
        {recipientName && <Text style={text}>Dear {recipientName},</Text>}
        {(message || '').split('\n').map((line: string, i: number) => (
          <Text key={i} style={line.startsWith('•') || line.startsWith('-') ? bulletStyle : text}>
            {line}
          </Text>
        ))}
        {ctaUrl && (
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={ctaUrl} style={ctaButton}>
              {ctaLabel || 'Download Now'}
            </Button>
          </Section>
        )}
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} — Automated System Notification</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GeneralNotificationEmail,
  subject: (data: Record<string, any>) => data.subject || 'System Notification',
  displayName: 'General Notification',
  previewData: { title: 'Important Notice', message: 'This is a system notification.', recipientName: 'Employee' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '18px', WebkitTextSizeAdjust: '100%', msTextSizeAdjust: '100%' as any }
const container = { padding: '40px 32px', maxWidth: '680px', width: '100%', margin: '0 auto' }
const h1 = { fontSize: '30px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 28px', lineHeight: '1.3' }
const text = { fontSize: '18px', color: '#000000', lineHeight: '1.7', margin: '0 0 16px', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const, overflowWrap: 'break-word' as const }
const bulletStyle = { ...text, paddingLeft: '16px' }
const hr = { borderColor: '#cccccc', margin: '32px 0' }
const footer = { fontSize: '14px', color: '#555555', margin: '0' }
const ctaButton = {
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '6px',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
