/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Row, Column, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Agro Coffee'

interface EudrSummaryProps {
  recipientName?: string
  reportDate?: string
  dispatchesToday?: number
  dispatchedKg?: number
  pendingDispatches?: number
  totalDispatches?: number
  recentDispatches?: Array<{ date: string; buyer: string; coffeeType: string; location: string; status: string }>
  truckCount?: number
  bagsDeducted?: number
  highlights?: string[]
  actionItems?: string[]
}

const EudrSummaryEmail = (props: EudrSummaryProps) => {
  const {
    recipientName = 'EUDR Team', reportDate = 'Today',
    dispatchesToday = 0, dispatchedKg = 0, pendingDispatches = 0,
    totalDispatches = 0, truckCount = 0, bagsDeducted = 0,
    recentDispatches = [], highlights = [], actionItems = [],
  } = props

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>EUDR Dispatch Report — {reportDate} | {dispatchesToday} dispatches today</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={{ fontSize: '28px', margin: '0 0 6px' }}>🚛</Text>
            <Heading style={headerTitle}>{SITE_NAME}</Heading>
            <Text style={headerSub}>EUDR & Dispatch — Daily Report</Text>
          </Section>
          <Section style={dateBanner}>
            <Text style={dateText}>{reportDate}</Text>
          </Section>

          <Text style={greeting}>Hi {recipientName},</Text>
          <Text style={intro}>Here's your daily EUDR dispatch comparison summary.</Text>

          <Section style={cardsRow}>
            <Row>
              <Column style={{ ...card, borderTop: '3px solid #28a745' }}>
                <Text style={cardVal}>{dispatchesToday}</Text>
                <Text style={cardLbl}>Dispatches Today</Text>
              </Column>
              <Column style={{ ...card, borderTop: '3px solid #17a2b8' }}>
                <Text style={cardVal}>{truckCount}</Text>
                <Text style={cardLbl}>Trucks Used</Text>
              </Column>
              <Column style={{ ...card, borderTop: '3px solid #ffc107' }}>
                <Text style={cardVal}>{pendingDispatches}</Text>
                <Text style={cardLbl}>Pending Reports</Text>
              </Column>
              <Column style={{ ...card, borderTop: '3px solid #1a5632' }}>
                <Text style={cardVal}>{totalDispatches}</Text>
                <Text style={cardLbl}>Total All Time</Text>
              </Column>
            </Row>
          </Section>

          {bagsDeducted > 0 && (
            <Section style={alertBox}>
              <Text style={{ fontSize: '13px', color: '#856404', margin: '0' }}>
                ⚠️ <strong>{bagsDeducted} bags deducted</strong> by buyers during dispatch comparisons today.
              </Text>
            </Section>
          )}

          {recentDispatches.length > 0 && (
            <>
              <Hr style={divider} />
              <Section style={{ padding: '0 25px' }}>
                <Text style={miniTitle}>Recent Dispatch Reports</Text>
                <Section style={tHead}>
                  <Row>
                    <Column style={{ ...thCell, width: '18%' }}>Date</Column>
                    <Column style={{ ...thCell, width: '27%' }}>Buyer</Column>
                    <Column style={{ ...thCell, width: '20%' }}>Type</Column>
                    <Column style={{ ...thCell, width: '20%' }}>Location</Column>
                    <Column style={{ ...thCell, width: '15%' }}>Status</Column>
                  </Row>
                </Section>
                {recentDispatches.slice(0, 10).map((d, i) => (
                  <Section key={i} style={i % 2 === 0 ? trEven : trOdd}>
                    <Row>
                      <Column style={{ ...tdCell, width: '18%' }}>{d.date}</Column>
                      <Column style={{ ...tdCell, width: '27%' }}>{d.buyer}</Column>
                      <Column style={{ ...tdCell, width: '20%' }}>{d.coffeeType}</Column>
                      <Column style={{ ...tdCell, width: '20%' }}>{d.location}</Column>
                      <Column style={{ ...tdCell, width: '15%' }}>{d.status}</Column>
                    </Row>
                  </Section>
                ))}
              </Section>
            </>
          )}

          {highlights.length > 0 && (
            <>
              <Hr style={divider} />
              <Section style={{ padding: '0 25px' }}>
                <Text style={miniTitle}>✨ Highlights</Text>
                {highlights.map((h, i) => <Text key={i} style={bullet}>• {h}</Text>)}
              </Section>
            </>
          )}

          {actionItems.length > 0 && (
            <Section style={alertBox}>
              <Text style={{ fontSize: '13px', fontWeight: '700', color: '#856404', margin: '0 0 4px' }}>⚠️ Action Required</Text>
              {actionItems.map((a, i) => <Text key={i} style={{ ...bullet, color: '#856404' }}>• {a}</Text>)}
            </Section>
          )}

          <Section style={footer}>
            <Text style={footerText}>Automated EUDR dispatch summary — {SITE_NAME}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EudrSummaryEmail,
  subject: (data: Record<string, any>) =>
    `🚛 EUDR Dispatch Report — ${data.reportDate || 'Today'} | ${data.dispatchesToday || 0} Dispatches`,
  displayName: 'EUDR Daily Summary',
  previewData: {
    recipientName: 'Benson', reportDate: 'Saturday, April 5, 2026',
    dispatchesToday: 2, truckCount: 4, pendingDispatches: 1, totalDispatches: 156,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '620px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '24px 25px 16px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerTitle = { fontSize: '20px', fontWeight: '700', color: '#fff', margin: '0 0 4px' }
const headerSub = { fontSize: '11px', color: '#b8d4c5', margin: '0', letterSpacing: '1.5px', textTransform: 'uppercase' as const }
const dateBanner = { backgroundColor: '#f0f7f3', padding: '8px 25px', borderBottom: '2px solid #1a5632' }
const dateText = { fontSize: '13px', color: '#1a5632', margin: '0', fontWeight: '600', textAlign: 'center' as const }
const greeting = { fontSize: '15px', color: '#1a1a1a', margin: '18px 25px 6px', fontWeight: '600' }
const intro = { fontSize: '13px', color: '#666', margin: '0 25px 16px', lineHeight: '1.5' }
const cardsRow = { padding: '0 20px', marginBottom: '12px' }
const card = { backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '12px 6px', textAlign: 'center' as const, margin: '0 2px', width: '23%' }
const cardVal = { fontSize: '20px', fontWeight: '800', color: '#1a1a1a', margin: '0' }
const cardLbl = { fontSize: '9px', fontWeight: '600', color: '#666', margin: '3px 0 1px', textTransform: 'uppercase' as const }
const divider = { borderColor: '#e9ecef', margin: '12px 25px' }
const miniTitle = { fontSize: '12px', fontWeight: '700', color: '#555', margin: '0 0 6px', textTransform: 'uppercase' as const }
const tHead = { backgroundColor: '#1a5632', borderRadius: '4px 4px 0 0' }
const thCell = { fontSize: '10px', fontWeight: '700', color: '#fff', padding: '6px 4px', textTransform: 'uppercase' as const }
const trEven = { backgroundColor: '#f8f9fa' }
const trOdd = { backgroundColor: '#ffffff', borderBottom: '1px solid #eee' }
const tdCell = { fontSize: '11px', color: '#333', padding: '6px 4px' }
const bullet = { fontSize: '13px', color: '#333', margin: '0 0 4px', lineHeight: '1.4' }
const alertBox = { backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '12px 16px', margin: '12px 25px' }
const footer = { padding: '16px 25px 24px', textAlign: 'center' as const, backgroundColor: '#f8f9fa', borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
