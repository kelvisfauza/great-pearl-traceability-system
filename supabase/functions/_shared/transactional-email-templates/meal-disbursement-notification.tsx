import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Great Agro Coffee"

interface MealDisbursementProps {
  adminName?: string
  receiverName?: string
  receiverPhone?: string
  amount?: string
  withdrawCharge?: string
  totalAmount?: string
  description?: string
  initiatedByName?: string
  yoStatus?: string
  yoReference?: string
  date?: string
}

const MealDisbursementNotificationEmail = (props: MealDisbursementProps) => {
  const statusColor = props.yoStatus === 'success' ? '#16a34a' : props.yoStatus === 'pending_approval' ? '#d97706' : '#dc2626';
  const statusLabel = props.yoStatus === 'success' ? '✅ Sent Successfully' : props.yoStatus === 'pending_approval' ? '⏳ Pending Yo Approval' : '❌ Failed';

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Meal Disbursement: UGX {props.totalAmount || '0'} to {props.receiverName || 'Receiver'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🍽️ Meal Disbursement Alert</Heading>

          <Text style={text}>Dear {props.adminName || 'Admin'},</Text>
          <Text style={text}>
            A meal allowance disbursement has been initiated by <strong>{props.initiatedByName || 'Admin'}</strong>.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailRow}><strong>Receiver:</strong> {props.receiverName || 'N/A'}</Text>
            <Text style={detailRow}><strong>Phone:</strong> {props.receiverPhone || 'N/A'}</Text>
            <Text style={detailRow}><strong>Meal Amount:</strong> UGX {props.amount || '0'}</Text>
            <Text style={detailRow}><strong>Withdraw Charge:</strong> UGX {props.withdrawCharge || '0'}</Text>
            <Text style={detailRow}><strong>Total Sent:</strong> UGX {props.totalAmount || '0'}</Text>
            <Text style={detailRow}><strong>Description:</strong> {props.description || 'N/A'}</Text>
            <Hr style={hr} />
            <Text style={{ ...detailRow, color: statusColor, fontWeight: 'bold' as const }}>
              Status: {statusLabel}
            </Text>
            <Text style={detailRow}><strong>Yo Reference:</strong> {props.yoReference || 'N/A'}</Text>
            <Text style={detailRow}><strong>Date:</strong> {props.date || 'N/A'}</Text>
          </Section>

          <Text style={footer}>— {SITE_NAME} Finance System</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MealDisbursementNotificationEmail,
  subject: (data: Record<string, any>) => `Meal Disbursement: UGX ${data.totalAmount || '0'} to ${data.receiverName || 'Receiver'}`,
  displayName: 'Meal Disbursement Notification',
  previewData: {
    adminName: 'Denis',
    receiverName: 'Restaurant Manager',
    receiverPhone: '256770123456',
    amount: '50,000',
    withdrawCharge: '1,500',
    totalAmount: '51,500',
    description: 'Lunch for field team - 10 people',
    initiatedByName: 'Musema Wyclif',
    yoStatus: 'success',
    yoReference: 'YO-123456',
    date: 'Monday, 14 April 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 12px' }
const detailsBox = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const detailRow = { fontSize: '13px', color: '#334155', margin: '4px 0', lineHeight: '1.5' }
const hr = { borderColor: '#e2e8f0', margin: '12px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
