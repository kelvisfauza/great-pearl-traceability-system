import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Column, Row,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface ApprovalActionProps {
  approverName?: string
  requestTitle?: string
  requestType?: string
  requestedBy?: string
  department?: string
  amount?: string
  priority?: string
  description?: string
  dateRequested?: string
  approvalStage?: string
  approveUrl?: string
  rejectUrl?: string
}

const ApprovalActionEmail = ({
  approverName = 'Approver',
  requestTitle = 'Approval Request',
  requestType = 'Expense',
  requestedBy = 'Staff',
  department = 'General',
  amount = '0',
  priority = 'Normal',
  description = '',
  dateRequested = '',
  approvalStage = 'Finance Review',
  approveUrl = '#',
  rejectUrl = '#',
}: ApprovalActionProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🔔 Action Required: {requestTitle} — UGX {amount} from {requestedBy}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerBadge}>⚡ ACTION REQUIRED</Text>
          <Heading style={h1}>Approval Request</Heading>
          <Text style={headerSub}>{approvalStage}</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>Dear {approverName},</Text>
          <Text style={text}>
            A new request requires your approval. Please review the details below and take action.
          </Text>

          {/* Request Details Card */}
          <Section style={detailsCard}>
            <Text style={detailsTitle}>📋 Request Details</Text>
            <Hr style={thinHr} />
            
            <Row>
              <Column style={labelCol}><Text style={label}>Title</Text></Column>
              <Column style={valueCol}><Text style={value}>{requestTitle}</Text></Column>
            </Row>
            <Row>
              <Column style={labelCol}><Text style={label}>Type</Text></Column>
              <Column style={valueCol}><Text style={value}>{requestType}</Text></Column>
            </Row>
            <Row>
              <Column style={labelCol}><Text style={label}>Requested By</Text></Column>
              <Column style={valueCol}><Text style={value}>{requestedBy}</Text></Column>
            </Row>
            <Row>
              <Column style={labelCol}><Text style={label}>Department</Text></Column>
              <Column style={valueCol}><Text style={value}>{department}</Text></Column>
            </Row>
            <Row>
              <Column style={labelCol}><Text style={label}>Date</Text></Column>
              <Column style={valueCol}><Text style={value}>{dateRequested}</Text></Column>
            </Row>
            {description && (
              <Row>
                <Column style={labelCol}><Text style={label}>Description</Text></Column>
                <Column style={valueCol}><Text style={value}>{description}</Text></Column>
              </Row>
            )}
          </Section>

          {/* Amount Highlight */}
          <Section style={amountCard}>
            <Text style={amountLabel}>AMOUNT REQUESTED</Text>
            <Text style={amountValue}>UGX {Number(amount).toLocaleString()}</Text>
            <Text style={priorityBadge}>Priority: {priority}</Text>
          </Section>

          {/* Action Buttons */}
          <Section style={actionsSection}>
            <Text style={actionsTitle}>Take Action</Text>
            <Text style={actionsDesc}>Click one of the buttons below to approve or reject this request directly from your email.</Text>
            
            <Section style={buttonsRow}>
              <Button href={approveUrl} style={approveButton}>
                ✅ Approve Request
              </Button>
            </Section>
            <Section style={{ ...buttonsRow, marginTop: '12px' }}>
              <Button href={rejectUrl} style={rejectButton}>
                ❌ Reject Request
              </Button>
            </Section>
          </Section>

          <Hr style={divider} />
          
          <Text style={footerNote}>
            🔒 These are single-use links tied to your account. They expire in 48 hours.
            Once you click, the other link becomes inactive.
          </Text>
          <Text style={footerNote}>
            You can also log in to the system to approve/reject from the Approvals dashboard.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME} — Approval System</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ApprovalActionEmail,
  subject: (data: Record<string, any>) => `🔔 Action Required: ${data.requestTitle || 'Approval Request'} — UGX ${Number(data.amount || 0).toLocaleString()}`,
  displayName: 'Approval action email with approve/reject buttons',
  previewData: {
    approverName: 'John',
    requestTitle: 'Office Supplies',
    requestType: 'Expense',
    requestedBy: 'Denis',
    department: 'Finance',
    amount: '500000',
    priority: 'High',
    description: 'Purchase of office supplies for Q2',
    dateRequested: '2026-04-05',
    approvalStage: 'Finance Review',
    approveUrl: 'https://example.com/approve-action?token=abc&action=approve',
    rejectUrl: 'https://example.com/approve-action?token=abc&action=reject',
  },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '580px', margin: '0 auto' }
const header = { backgroundColor: '#1a56db', padding: '30px 25px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const headerBadge = { color: '#fbbf24', fontSize: '11px', fontWeight: '800' as const, letterSpacing: '2px', margin: '0 0 6px' }
const h1 = { color: '#ffffff', fontSize: '24px', fontWeight: '700' as const, margin: '0 0 4px' }
const headerSub = { color: '#bfdbfe', fontSize: '13px', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#1e293b', fontWeight: '600' as const, margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const detailsCard = { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '16px 20px', border: '1px solid #e2e8f0', margin: '0 0 16px' }
const detailsTitle = { fontSize: '13px', fontWeight: '700' as const, color: '#1e293b', margin: '0 0 8px' }
const thinHr = { borderColor: '#e2e8f0', margin: '8px 0 12px' }
const labelCol = { width: '120px', verticalAlign: 'top' as const }
const valueCol = { verticalAlign: 'top' as const }
const label = { fontSize: '12px', color: '#94a3b8', fontWeight: '600' as const, margin: '2px 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { fontSize: '13px', color: '#1e293b', fontWeight: '500' as const, margin: '2px 0' }
const amountCard = { backgroundColor: '#fef3c7', borderRadius: '10px', padding: '20px', textAlign: 'center' as const, border: '1px solid #fde68a', margin: '0 0 20px' }
const amountLabel = { fontSize: '10px', fontWeight: '700' as const, color: '#92400e', letterSpacing: '2px', margin: '0 0 4px' }
const amountValue = { fontSize: '28px', fontWeight: '900' as const, color: '#78350f', margin: '0 0 6px' }
const priorityBadge = { fontSize: '11px', color: '#b45309', margin: '0' }
const actionsSection = { textAlign: 'center' as const, margin: '0 0 20px' }
const actionsTitle = { fontSize: '14px', fontWeight: '700' as const, color: '#1e293b', margin: '0 0 4px' }
const actionsDesc = { fontSize: '12px', color: '#64748b', margin: '0 0 16px' }
const buttonsRow = { textAlign: 'center' as const }
const approveButton = { backgroundColor: '#16a34a', color: '#ffffff', fontSize: '15px', fontWeight: '700' as const, padding: '14px 40px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
const rejectButton = { backgroundColor: '#dc2626', color: '#ffffff', fontSize: '15px', fontWeight: '700' as const, padding: '14px 40px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
const divider = { borderColor: '#e2e8f0', margin: '20px 0' }
const footerNote = { fontSize: '11px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 6px' }
const footer = { backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '0 0 12px 12px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#94a3b8', margin: '0' }
