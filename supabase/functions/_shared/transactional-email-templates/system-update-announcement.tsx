import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Pearl Coffee'

interface SystemUpdateProps {
  name?: string
}

const SystemUpdateEmail = ({ name }: SystemUpdateProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🚀 Important System Updates — New Daily Reports & Schedule Changes</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerEmoji}>🚀</Text>
          <Heading style={h1}>System Updates</Heading>
          <Text style={subtitle}>Great Pearl Traceability System</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>
            {name ? `Dear ${name},` : 'Dear Team Member,'}
          </Text>

          <Text style={bodyText}>
            We're excited to share some important updates to our system that will help you
            stay on top of your daily responsibilities more effectively. Here's what's new:
          </Text>

          {/* Update 1 */}
          <Section style={updateCard}>
            <Text style={cardIcon}>📊</Text>
            <Text style={cardTitle}>Automated Daily Department Reports</Text>
            <Text style={cardText}>
              Every department now receives a personalized end-of-day summary email.
              These reports are tailored to your department and include key metrics,
              pending tasks, and actionable insights from the day's operations.
            </Text>
          </Section>

          {/* Update 2 */}
          <Section style={updateCard}>
            <Text style={cardIcon}>🏢</Text>
            <Text style={cardTitle}>8 Department Reports Now Active</Text>
            <Text style={cardText}>
              Reports are now live for: <strong>Administration, Quality Control, Operations,
              Field Operations, IT, Finance, EUDR Documentation,</strong> and <strong>Sales</strong>.
              Each report is customized with department-specific data.
            </Text>
          </Section>

          {/* Department Details */}
          <Section style={detailsSection}>
            <Text style={detailsTitle}>What Each Department Receives:</Text>
            
            <Text style={detailItem}>
              <strong>🔹 Admin:</strong> Executive overview — inventory levels, sales, approvals,
              purchases vs. previous day, withdrawals, dispatch status, milling & field operations.
            </Text>
            <Text style={detailItem}>
              <strong>🔹 Quality Control:</strong> Pending & assessed batches with supplier details,
              coffee type, and delivery dates.
            </Text>
            <Text style={detailItem}>
              <strong>🔹 Operations:</strong> Store inventory, dispatch updates, daily sales, and purchase summaries.
            </Text>
            <Text style={detailItem}>
              <strong>🔹 Field Operations:</strong> Field reports, kg mobilized, villages visited, and daily activities.
            </Text>
            <Text style={detailItem}>
              <strong>🔹 Finance:</strong> Full financial overview — revenue, payments, expenses, cash flow,
              supplier balances, withdrawal costs, and salary advances.
            </Text>
            <Text style={detailItem}>
              <strong>🔹 EUDR:</strong> Dispatch reports, truck usage, bag tracking, and compliance status.
            </Text>
            <Text style={detailItem}>
              <strong>🔹 Sales:</strong> Sales transactions, contract fulfillment, and buyer allocations.
            </Text>
            <Text style={detailItem}>
              <strong>🔹 IT:</strong> System logins, active users, and technical activity.
            </Text>
          </Section>

          {/* Schedule Update */}
          <Section style={scheduleCard}>
            <Text style={cardIcon}>⏰</Text>
            <Text style={cardTitle}>Report Schedule</Text>
            <Text style={cardText}>
              Reports are sent automatically every <strong>Monday through Saturday at 5:00 PM EAT</strong>.
              You'll receive your department's summary in your email inbox — no action needed from you.
            </Text>
          </Section>

          {/* What to do */}
          <Section style={actionSection}>
            <Text style={actionTitle}>📋 What You Need To Do:</Text>
            <Text style={actionItem}>✅ Check your email daily at 5 PM for your department report</Text>
            <Text style={actionItem}>✅ Review pending tasks highlighted in your report</Text>
            <Text style={actionItem}>✅ Follow up on any flagged items before the next working day</Text>
            <Text style={actionItem}>✅ Report any issues or suggestions to IT/Admin</Text>
          </Section>

          <Hr style={divider} />

          <Text style={bodyText}>
            These updates are part of our ongoing effort to improve transparency, accountability,
            and efficiency across all departments. If you have any questions or feedback about
            these changes, please reach out to the IT or Administration team.
          </Text>

          <Text style={closing}>
            Best regards,<br />
            <strong>The Great Pearl Coffee Management Team</strong>
          </Text>
        </Section>

        {/* Footer */}
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
  component: SystemUpdateEmail,
  subject: '🚀 Important System Updates — New Daily Reports & Schedule Changes',
  displayName: 'System update announcement',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '30px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerEmoji = { fontSize: '40px', margin: '0 0 10px' }
const h1 = { fontSize: '26px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '14px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '16px', color: '#333333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const updateCard = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '18px', margin: '0 0 15px', borderLeft: '4px solid #1a5632' }
const cardIcon = { fontSize: '24px', margin: '0 0 8px' }
const cardTitle = { fontSize: '16px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 8px' }
const cardText = { fontSize: '13px', color: '#555555', lineHeight: '1.5', margin: '0' }
const detailsSection = { backgroundColor: '#fafafa', borderRadius: '8px', padding: '18px', margin: '0 0 15px' }
const detailsTitle = { fontSize: '15px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 12px' }
const detailItem = { fontSize: '13px', color: '#555555', lineHeight: '1.5', margin: '0 0 10px' }
const scheduleCard = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '18px', margin: '0 0 15px', borderLeft: '4px solid #f9a825' }
const actionSection = { backgroundColor: '#e8f5e9', borderRadius: '8px', padding: '18px', margin: '0 0 15px' }
const actionTitle = { fontSize: '15px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 12px' }
const actionItem = { fontSize: '13px', color: '#333333', lineHeight: '1.8', margin: '0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closing = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0' }
const footer = { backgroundColor: '#f5f5f5', padding: '15px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999999', margin: '0' }
