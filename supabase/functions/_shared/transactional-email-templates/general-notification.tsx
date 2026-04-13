import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Great Pearl Coffee"

interface GeneralNotificationProps {
  title?: string
  message?: string
  recipientName?: string
}

const GeneralNotificationEmail = ({ title, message, recipientName }: GeneralNotificationProps) => (
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

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0 0 8px', whiteSpace: 'pre-wrap' as const }
const bulletStyle = { ...text, paddingLeft: '12px' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
