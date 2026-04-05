/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Row,
  Column,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Agro Coffee'

interface PendingBatch {
  batch_number: string
  supplier_name: string
  coffee_type: string
  kilograms: number
  date: string
}

interface AssessedBatch {
  batch_number: string
  supplier_name: string
  coffee_type: string
  kilograms: number
  date: string
}

interface DailyQualitySummaryProps {
  recipientName?: string
  reportDate?: string
  totalPending?: number
  totalAssessedToday?: number
  totalPendingKg?: number
  totalAssessedKg?: number
  pendingBatches?: PendingBatch[]
  assessedBatches?: AssessedBatch[]
}

const DailyQualitySummaryEmail = ({
  recipientName = 'Team',
  reportDate = new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  totalPending = 0,
  totalAssessedToday = 0,
  totalPendingKg = 0,
  totalAssessedKg = 0,
  pendingBatches = [],
  assessedBatches = [],
}: DailyQualitySummaryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Daily Quality Summary — {totalPending} pending, {totalAssessedToday} assessed | {reportDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerSection}>
          <Text style={headerLogo}>☕</Text>
          <Heading style={headerTitle}>{SITE_NAME}</Heading>
          <Text style={headerSubtitle}>Quality Department — Daily Summary</Text>
        </Section>

        <Section style={dateSection}>
          <Text style={dateText}>{reportDate}</Text>
        </Section>

        {/* Greeting */}
        <Text style={greeting}>Hi {recipientName},</Text>
        <Text style={introText}>
          Here's your end-of-day quality summary. Please review pending batches and ensure all assessments are up to date.
        </Text>

        {/* Stats Cards */}
        <Section style={statsContainer}>
          <Row>
            <Column style={statCardPending}>
              <Text style={statNumber}>{totalPending}</Text>
              <Text style={statLabel}>Pending Batches</Text>
              <Text style={statSubLabel}>{totalPendingKg.toLocaleString()} kg</Text>
            </Column>
            <Column style={statCardAssessed}>
              <Text style={statNumber}>{totalAssessedToday}</Text>
              <Text style={statLabel}>Assessed Today</Text>
              <Text style={statSubLabel}>{totalAssessedKg.toLocaleString()} kg</Text>
            </Column>
          </Row>
        </Section>

        <Hr style={divider} />

        {/* Pending Batches Table */}
        {pendingBatches.length > 0 && (
          <Section>
            <Heading style={sectionTitle}>
              ⏳ Pending Quality Assessment ({pendingBatches.length} batches)
            </Heading>
            <Text style={sectionDesc}>
              These batches are awaiting quality assessment. Please prioritize.
            </Text>

            {/* Table Header */}
            <Section style={tableHeader}>
              <Row>
                <Column style={{ ...tableHeaderCell, width: '22%' }}>Batch #</Column>
                <Column style={{ ...tableHeaderCell, width: '30%' }}>Supplier</Column>
                <Column style={{ ...tableHeaderCell, width: '18%' }}>Type</Column>
                <Column style={{ ...tableHeaderCell, width: '15%' }}>Weight</Column>
                <Column style={{ ...tableHeaderCell, width: '15%' }}>Date</Column>
              </Row>
            </Section>

            {/* Table Rows */}
            {pendingBatches.map((batch, i) => (
              <Section key={i} style={i % 2 === 0 ? tableRowEven : tableRowOdd}>
                <Row>
                  <Column style={{ ...tableCell, width: '22%', fontWeight: '600' }}>{batch.batch_number}</Column>
                  <Column style={{ ...tableCell, width: '30%' }}>{batch.supplier_name}</Column>
                  <Column style={{ ...tableCell, width: '18%' }}>{batch.coffee_type}</Column>
                  <Column style={{ ...tableCell, width: '15%' }}>{batch.kilograms.toLocaleString()} kg</Column>
                  <Column style={{ ...tableCell, width: '15%' }}>{batch.date}</Column>
                </Row>
              </Section>
            ))}
          </Section>
        )}

        {pendingBatches.length === 0 && (
          <Section style={emptySection}>
            <Text style={emptyText}>✅ No pending batches — all caught up!</Text>
          </Section>
        )}

        <Hr style={divider} />

        {/* Assessed Batches Table */}
        {assessedBatches.length > 0 && (
          <Section>
            <Heading style={sectionTitle}>
              ✅ Assessed Today ({assessedBatches.length} batches)
            </Heading>
            <Text style={sectionDesc}>
              These batches were assessed today. Great work!
            </Text>

            <Section style={tableHeader}>
              <Row>
                <Column style={{ ...tableHeaderCell, width: '22%' }}>Batch #</Column>
                <Column style={{ ...tableHeaderCell, width: '30%' }}>Supplier</Column>
                <Column style={{ ...tableHeaderCell, width: '18%' }}>Type</Column>
                <Column style={{ ...tableHeaderCell, width: '15%' }}>Weight</Column>
                <Column style={{ ...tableHeaderCell, width: '15%' }}>Date</Column>
              </Row>
            </Section>

            {assessedBatches.map((batch, i) => (
              <Section key={i} style={i % 2 === 0 ? tableRowEven : tableRowOdd}>
                <Row>
                  <Column style={{ ...tableCell, width: '22%', fontWeight: '600' }}>{batch.batch_number}</Column>
                  <Column style={{ ...tableCell, width: '30%' }}>{batch.supplier_name}</Column>
                  <Column style={{ ...tableCell, width: '18%' }}>{batch.coffee_type}</Column>
                  <Column style={{ ...tableCell, width: '15%' }}>{batch.kilograms.toLocaleString()} kg</Column>
                  <Column style={{ ...tableCell, width: '15%' }}>{batch.date}</Column>
                </Row>
              </Section>
            ))}
          </Section>
        )}

        {assessedBatches.length === 0 && (
          <Section style={emptySection}>
            <Text style={emptyText}>No batches were assessed today.</Text>
          </Section>
        )}

        <Hr style={divider} />

        {/* Action Required */}
        {totalPending > 0 && (
          <Section style={alertSection}>
            <Text style={alertText}>
              ⚠️ <strong>Action Required:</strong> {totalPending} batch{totalPending > 1 ? 'es' : ''} ({totalPendingKg.toLocaleString()} kg) still need quality assessment. Please ensure these are completed before end of business tomorrow.
            </Text>
          </Section>
        )}

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            This is an automated daily summary from {SITE_NAME} Quality Management System.
          </Text>
          <Text style={footerText}>
            Report generated at {new Date().toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })} EAT
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailyQualitySummaryEmail,
  subject: (data: Record<string, any>) =>
    `Daily Quality Summary — ${data.totalPending || 0} Pending, ${data.totalAssessedToday || 0} Assessed | ${data.reportDate || 'Today'}`,
  displayName: 'Daily Quality Summary',
  previewData: {
    recipientName: 'Adinan',
    reportDate: 'Saturday, April 5, 2026',
    totalPending: 87,
    totalAssessedToday: 12,
    totalPendingKg: 15420,
    totalAssessedKg: 3200,
    pendingBatches: [
      { batch_number: '20260403008', supplier_name: 'kanyoma (GPC 00074)', coffee_type: 'Arabica', kilograms: 102, date: '2026-04-03' },
      { batch_number: '20260403006', supplier_name: 'kambale (GPC 00069)', coffee_type: 'Arabica', kilograms: 632, date: '2026-04-03' },
    ],
    assessedBatches: [
      { batch_number: '20260405001', supplier_name: 'Test Supplier', coffee_type: 'Arabica', kilograms: 500, date: '2026-04-05' },
    ],
  },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '620px', margin: '0 auto' }

const headerSection = {
  backgroundColor: '#1a5632',
  padding: '30px 25px 20px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
}
const headerLogo = { fontSize: '36px', margin: '0 0 8px' }
const headerTitle = { fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: '0 0 4px' }
const headerSubtitle = { fontSize: '13px', color: '#b8d4c5', margin: '0', letterSpacing: '1px', textTransform: 'uppercase' as const }

const dateSection = {
  backgroundColor: '#f0f7f3',
  padding: '10px 25px',
  borderBottom: '2px solid #1a5632',
}
const dateText = { fontSize: '13px', color: '#1a5632', margin: '0', fontWeight: '600', textAlign: 'center' as const }

const greeting = { fontSize: '15px', color: '#1a1a1a', margin: '24px 25px 8px', fontWeight: '600' }
const introText = { fontSize: '14px', color: '#555555', margin: '0 25px 20px', lineHeight: '1.5' }

const statsContainer = { padding: '0 20px', marginBottom: '20px' }
const statCardPending = {
  backgroundColor: '#fef3cd',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  width: '48%',
}
const statCardAssessed = {
  backgroundColor: '#d4edda',
  border: '1px solid #28a745',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  width: '48%',
}
const statNumber = { fontSize: '28px', fontWeight: '800', color: '#1a1a1a', margin: '0' }
const statLabel = { fontSize: '12px', fontWeight: '600', color: '#555', margin: '4px 0 2px', textTransform: 'uppercase' as const }
const statSubLabel = { fontSize: '11px', color: '#888', margin: '0' }

const divider = { borderColor: '#e9ecef', margin: '16px 25px' }

const sectionTitle = { fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0 25px 6px' }
const sectionDesc = { fontSize: '13px', color: '#666', margin: '0 25px 12px' }

const tableHeader = { backgroundColor: '#1a5632', margin: '0 25px', borderRadius: '4px 4px 0 0' }
const tableHeaderCell = { fontSize: '11px', fontWeight: '700', color: '#ffffff', padding: '8px 6px', textTransform: 'uppercase' as const }
const tableRowEven = { backgroundColor: '#f8f9fa', margin: '0 25px' }
const tableRowOdd = { backgroundColor: '#ffffff', margin: '0 25px', borderBottom: '1px solid #eee' }
const tableCell = { fontSize: '12px', color: '#333', padding: '8px 6px' }

const emptySection = { padding: '20px 25px', textAlign: 'center' as const }
const emptyText = { fontSize: '14px', color: '#28a745', fontWeight: '600' }

const alertSection = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '0 25px 20px',
}
const alertText = { fontSize: '13px', color: '#856404', margin: '0', lineHeight: '1.5' }

const footerSection = { padding: '20px 25px 30px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#999', margin: '0 0 4px' }
