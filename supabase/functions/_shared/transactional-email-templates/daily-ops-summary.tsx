/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Row, Column, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Agro Coffee'

interface OpsSummaryProps {
  recipientName?: string
  reportDate?: string
  department?: string
  // Operations
  inventoryBatches?: number
  inventoryKg?: number
  dispatchesToday?: number
  dispatchedKg?: number
  salesToday?: number
  salesKg?: number
  purchasesToday?: number
  purchasesKg?: number
  pendingAssessment?: number
  pendingAssessmentKg?: number
  // Field specific
  fieldReportsToday?: number
  kgMobilized?: number
  villagesVisited?: number
  farmersVisited?: number
  // IT specific
  activeEmployees?: number
  loginsToday?: number
  pendingIssues?: number
  // Generic items
  highlights?: string[]
  actionItems?: string[]
}

const OpsSummaryEmail = (props: OpsSummaryProps) => {
  const {
    recipientName = 'Team', reportDate = 'Today', department = 'Operations',
    inventoryBatches = 0, inventoryKg = 0, dispatchesToday = 0, dispatchedKg = 0,
    salesToday = 0, salesKg = 0, purchasesToday = 0, purchasesKg = 0,
    pendingAssessment = 0, pendingAssessmentKg = 0,
    fieldReportsToday = 0, kgMobilized = 0, villagesVisited = 0, farmersVisited = 0,
    activeEmployees = 0, loginsToday = 0, pendingIssues = 0,
    highlights = [], actionItems = [],
  } = props

  const isField = department.toLowerCase().includes('field')
  const isIT = department.toLowerCase().includes('it')
  const isOps = !isField && !isIT

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{department} Daily Summary — {reportDate}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={{ fontSize: '28px', margin: '0 0 6px' }}>{isField ? '🌾' : isIT ? '💻' : '📋'}</Text>
            <Heading style={headerTitle}>{SITE_NAME}</Heading>
            <Text style={headerSub}>{department} — Daily Summary</Text>
          </Section>
          <Section style={dateBanner}>
            <Text style={dateTextStyle}>{reportDate}</Text>
          </Section>

          <Text style={greeting}>Hi {recipientName},</Text>
          <Text style={intro}>Here's your end-of-day {department.toLowerCase()} summary.</Text>

          {/* Operations specific */}
          {isOps && (
            <>
              <Section style={sectionHdr}><Text style={secTitle}>📦 Store & Inventory</Text></Section>
              <Section style={cardsRow}>
                <Row>
                  <Column style={{ ...card, borderTop: '3px solid #17a2b8' }}>
                    <Text style={cardVal}>{inventoryBatches}</Text>
                    <Text style={cardLbl}>Store Batches</Text>
                    <Text style={cardSub}>{inventoryKg.toLocaleString()} kg</Text>
                  </Column>
                  <Column style={{ ...card, borderTop: '3px solid #ffc107' }}>
                    <Text style={cardVal}>{pendingAssessment}</Text>
                    <Text style={cardLbl}>Pending QC</Text>
                    <Text style={cardSub}>{pendingAssessmentKg.toLocaleString()} kg</Text>
                  </Column>
                  <Column style={{ ...card, borderTop: '3px solid #28a745' }}>
                    <Text style={cardVal}>{purchasesToday}</Text>
                    <Text style={cardLbl}>Purchases</Text>
                    <Text style={cardSub}>{purchasesKg.toLocaleString()} kg</Text>
                  </Column>
                </Row>
              </Section>
              <Hr style={divider} />
              <Section style={sectionHdr}><Text style={secTitle}>🚛 Dispatch & Sales</Text></Section>
              <Section style={cardsRow}>
                <Row>
                  <Column style={{ ...card, borderTop: '3px solid #1a5632' }}>
                    <Text style={cardVal}>{dispatchesToday}</Text>
                    <Text style={cardLbl}>Dispatches</Text>
                    <Text style={cardSub}>{dispatchedKg.toLocaleString()} kg</Text>
                  </Column>
                  <Column style={{ ...card, borderTop: '3px solid #28a745' }}>
                    <Text style={cardVal}>{salesToday}</Text>
                    <Text style={cardLbl}>Sales</Text>
                    <Text style={cardSub}>{salesKg.toLocaleString()} kg</Text>
                  </Column>
                </Row>
              </Section>
            </>
          )}

          {/* Field specific */}
          {isField && (
            <>
              <Section style={sectionHdr}><Text style={secTitle}>🌾 Field Activity</Text></Section>
              <Section style={cardsRow}>
                <Row>
                  <Column style={{ ...card, borderTop: '3px solid #28a745' }}>
                    <Text style={cardVal}>{fieldReportsToday}</Text>
                    <Text style={cardLbl}>Reports Filed</Text>
                  </Column>
                  <Column style={{ ...card, borderTop: '3px solid #1a5632' }}>
                    <Text style={cardVal}>{kgMobilized.toLocaleString()}</Text>
                    <Text style={cardLbl}>Kg Mobilized</Text>
                  </Column>
                  <Column style={{ ...card, borderTop: '3px solid #17a2b8' }}>
                    <Text style={cardVal}>{villagesVisited}</Text>
                    <Text style={cardLbl}>Villages</Text>
                  </Column>
                </Row>
              </Section>
            </>
          )}

          {/* IT specific */}
          {isIT && (
            <>
              <Section style={sectionHdr}><Text style={secTitle}>💻 System Status</Text></Section>
              <Section style={cardsRow}>
                <Row>
                  <Column style={{ ...card, borderTop: '3px solid #28a745' }}>
                    <Text style={cardVal}>{activeEmployees}</Text>
                    <Text style={cardLbl}>Active Users</Text>
                  </Column>
                  <Column style={{ ...card, borderTop: '3px solid #17a2b8' }}>
                    <Text style={cardVal}>{loginsToday}</Text>
                    <Text style={cardLbl}>Logins Today</Text>
                  </Column>
                  <Column style={{ ...card, borderTop: '3px solid #ffc107' }}>
                    <Text style={cardVal}>{pendingIssues}</Text>
                    <Text style={cardLbl}>Pending Issues</Text>
                  </Column>
                </Row>
              </Section>
            </>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <>
              <Hr style={divider} />
              <Section style={sectionHdr}><Text style={secTitle}>✨ Today's Highlights</Text></Section>
              <Section style={{ padding: '0 25px' }}>
                {highlights.map((h, i) => (
                  <Text key={i} style={bulletItem}>• {h}</Text>
                ))}
              </Section>
            </>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <>
              <Hr style={divider} />
              <Section style={alertBox}>
                <Text style={{ fontSize: '13px', fontWeight: '700', color: '#856404', margin: '0 0 6px' }}>⚠️ Action Required</Text>
                {actionItems.map((a, i) => (
                  <Text key={i} style={{ ...bulletItem, color: '#856404' }}>• {a}</Text>
                ))}
              </Section>
            </>
          )}

          <Section style={footer}>
            <Text style={footerText}>Automated daily summary — {SITE_NAME}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OpsSummaryEmail,
  subject: (data: Record<string, any>) =>
    `${data.department || 'Operations'} Daily Summary — ${data.reportDate || 'Today'}`,
  displayName: 'Department Daily Summary',
  previewData: {
    recipientName: 'John', reportDate: 'Saturday, April 5, 2026', department: 'Operations',
    inventoryBatches: 72, inventoryKg: 34249, pendingAssessment: 87, pendingAssessmentKg: 67843,
    purchasesToday: 11, purchasesKg: 3534, dispatchesToday: 1, dispatchedKg: 18000,
    salesToday: 2, salesKg: 18000,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '620px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '24px 25px 16px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerTitle = { fontSize: '20px', fontWeight: '700', color: '#fff', margin: '0 0 4px' }
const headerSub = { fontSize: '11px', color: '#b8d4c5', margin: '0', letterSpacing: '1.5px', textTransform: 'uppercase' as const }
const dateBanner = { backgroundColor: '#f0f7f3', padding: '8px 25px', borderBottom: '2px solid #1a5632' }
const dateTextStyle = { fontSize: '13px', color: '#1a5632', margin: '0', fontWeight: '600', textAlign: 'center' as const }
const greeting = { fontSize: '15px', color: '#1a1a1a', margin: '18px 25px 6px', fontWeight: '600' }
const intro = { fontSize: '13px', color: '#666', margin: '0 25px 16px', lineHeight: '1.5' }
const sectionHdr = { padding: '0 25px', marginBottom: '8px' }
const secTitle = { fontSize: '14px', fontWeight: '700', color: '#1a1a1a', margin: '0' }
const cardsRow = { padding: '0 20px', marginBottom: '12px' }
const card = { backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '12px 8px', textAlign: 'center' as const, margin: '0 3px', width: '30%' }
const cardVal = { fontSize: '22px', fontWeight: '800', color: '#1a1a1a', margin: '0' }
const cardLbl = { fontSize: '10px', fontWeight: '600', color: '#666', margin: '3px 0 1px', textTransform: 'uppercase' as const }
const cardSub = { fontSize: '10px', color: '#999', margin: '0' }
const divider = { borderColor: '#e9ecef', margin: '12px 25px' }
const bulletItem = { fontSize: '13px', color: '#333', margin: '0 0 4px', lineHeight: '1.4' }
const alertBox = { backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '12px 16px', margin: '0 25px 16px' }
const footer = { padding: '16px 25px 24px', textAlign: 'center' as const, backgroundColor: '#f8f9fa', borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
