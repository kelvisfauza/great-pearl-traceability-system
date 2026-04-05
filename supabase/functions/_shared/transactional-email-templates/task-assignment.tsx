import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface TaskAssignmentProps {
  recipientName?: string
  subject?: string
  message?: string
  tasks?: string[]
  urgency?: string
  senderName?: string
}

const TaskAssignmentEmail = ({ recipientName, subject, message, tasks, urgency, senderName }: TaskAssignmentProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>📋 Task Assignment — Action Required</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} width="60" height="60" alt={SITE_NAME} style={{ margin: '0 auto 10px', display: 'block', borderRadius: '8px' }} />
          <Heading style={h1}>Task Assignment</Heading>
          <Text style={subtitle}>{SITE_NAME} — Action Required</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>
            Dear {recipientName || 'Team Member'},
          </Text>

          {urgency === 'high' && (
            <Section style={urgentBadge}>
              <Text style={urgentText}>⚠️ HIGH PRIORITY — Immediate action required</Text>
            </Section>
          )}

          {message && <Text style={bodyText}>{message}</Text>}

          {tasks && tasks.length > 0 && (
            <Section style={taskSection}>
              <Text style={taskTitle}>📋 Tasks To Complete:</Text>
              {tasks.map((task, i) => (
                <Text key={i} style={taskItem}>
                  {`${i + 1}. ${task}`}
                </Text>
              ))}
            </Section>
          )}

          <Hr style={divider} />

          <Text style={bodyText}>
            Please prioritize these tasks and update your progress in the system. 
            If you have any questions or need support, reach out to your supervisor or the IT team.
          </Text>

          <Text style={closing}>
            Best regards,<br />
            <strong>{senderName || 'Management'}</strong><br />
            {SITE_NAME}
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            © 2026 {SITE_NAME} • Great Pearl Traceability System
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TaskAssignmentEmail,
  subject: (data: Record<string, any>) => data?.subject || '📋 Task Assignment — Action Required',
  displayName: 'Task assignment',
  previewData: { recipientName: 'John', subject: 'Pending EUDR Tasks', message: 'You have pending tasks.', tasks: ['Complete batch documentation', 'Review inventory'], urgency: 'high', senderName: 'Kelvis Fauza' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '16px', color: '#333333', margin: '0 0 15px' }
const urgentBadge = { backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '10px 15px', margin: '0 0 18px' }
const urgentText = { fontSize: '14px', fontWeight: 'bold', color: '#856404', margin: '0' }
const bodyText = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 18px' }
const taskSection = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '18px', margin: '0 0 18px', borderLeft: '4px solid #1a5632' }
const taskTitle = { fontSize: '15px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 12px' }
const taskItem = { fontSize: '14px', color: '#333333', lineHeight: '1.8', margin: '0 0 4px', paddingLeft: '8px' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closing = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0' }
const footer = { backgroundColor: '#f5f5f5', padding: '15px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999999', margin: '0' }
