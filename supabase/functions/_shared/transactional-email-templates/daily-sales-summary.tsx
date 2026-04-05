/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Row, Column, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Agro Coffee'

interface SalesSummaryProps {
  recipientName?: string
  reportDate?: string
  salesToday?: number
  salesRevenueToday?: number
  salesKgToday?: number
  activeContracts?: number
  contractsNearExpiry?: number
  totalContractedKg?: number
  fulfilledKg?: number
  remainingKg?: number
  recentSales?: Array<{ customer: string; coffeeType: string; weight: number; amount: number; date: string }>
  contractSummary?: Array<{ buyer: string; contractRef: string; totalKg: number; allocatedKg: number; remaining: number; status: string }>
  highlights?: string[]
  actionItems?: string[]
}

const SalesSummaryEmail = (props: SalesSummaryProps) => {
  const {
    recipientName = 'Sales Team', reportDate = 'Today',
    salesToday = 0, salesRevenueToday = 0, salesKgToday = 0,
    activeContracts = 0, contractsNearExpiry = 0,
    totalContractedKg = 0, fulfilledKg = 0, remainingKg = 0,
    recentSales = [], contractSummary = [],
    highlights = [], actionItems = [],
  } = props

  const fulfillmentPct = totalContractedKg > 0 ? Math.round((fulfilledKg / totalContractedKg) * 100) : 0

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Sales & Contracts Report — {reportDate} | {salesToday} sales, {activeContracts} active contracts</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={{ fontSize: '28px', margin: '0 0 6px' }}>📊</Text>
            <Heading style={headerTitle}>{SITE_NAME}</Heading>
            <Text style={headerSub}>Sales & Contracts — Daily Report</Text>
          </Section>
          <Section style={dateBanner}>
            <Text style={dateText}>{reportDate}</Text>
          </Section>

          <Text style={greeting}>Hi {recipientName},</Text>
          <Text style={intro}>Here's your daily sales and contract fulfillment summary.</Text>

          {/* Sales Stats */}
          <Section style={secHdr}><Text style={secTitle}>💰 Today's Sales</Text></Section>
          <Section style={cardsRow}>
            <Row>
              <Column style={{ ...card, borderTop: '3px solid #28a745' }}>
                <Text style={cardVal}>{salesToday}</Text>
                <Text style={cardLbl}>Sales Made</Text>
                <Text style={cardSubText}>{salesKgToday.toLocaleString()} kg</Text>
              </Column>
              <Column style={{ ...card, borderTop: '3px solid #1a5632' }}>
                <Text style={cardVal}>{`UGX ${(salesRevenueToday / 1000000).toFixed(1)}M`}</Text>
                <Text style={cardLbl}>Revenue</Text>
                <Text style={cardSubText}>{salesRevenueToday.toLocaleString()}</Text>
              </Column>
            </Row>
          </Section>

          {recentSales.length > 0 && (
            <Section style={{ margin: '0 25px 14px' }}>
              <Text style={miniTitle}>Recent Sales</Text>
              <Section style={tHead}>
                <Row>
                  <Column style={{ ...thCell, width: '28%' }}>Customer</Column>
                  <Column style={{ ...thCell, width: '20%' }}>Type</Column>
                  <Column style={{ ...thCell, width: '17%' }}>Weight</Column>
                  <Column style={{ ...thCell, width: '20%' }}>Amount</Column>
                  <Column style={{ ...thCell, width: '15%' }}>Date</Column>
                </Row>
              </Section>
              {recentSales.slice(0, 8).map((s, i) => (
                <Section key={i} style={i % 2 === 0 ? trEven : trOdd}>
                  <Row>
                    <Column style={{ ...tdCell, width: '28%' }}>{s.customer}</Column>
                    <Column style={{ ...tdCell, width: '20%' }}>{s.coffeeType}</Column>
                    <Column style={{ ...tdCell, width: '17%' }}>{s.weight.toLocaleString()} kg</Column>
                    <Column style={{ ...tdCell, width: '20%' }}>UGX {s.amount.toLocaleString()}</Column>
                    <Column style={{ ...tdCell, width: '15%' }}>{s.date}</Column>
                  </Row>
                </Section>
              ))}
            </Section>
          )}

          <Hr style={divider} />

          {/* Contracts */}
          <Section style={secHdr}><Text style={secTitle}>📋 Contract Status</Text></Section>
          <Section style={cardsRow}>
            <Row>
              <Column style={{ ...card, borderTop: '3px solid #17a2b8' }}>
                <Text style={cardVal}>{activeContracts}</Text>
                <Text style={cardLbl}>Active Contracts</Text>
              </Column>
              <Column style={{ ...card, borderTop: '3px solid #28a745' }}>
                <Text style={cardVal}>{fulfillmentPct}%</Text>
                <Text style={cardLbl}>Fulfilled</Text>
                <Text style={cardSubText}>{fulfilledKg.toLocaleString()} / {totalContractedKg.toLocaleString()} kg</Text>
              </Column>
              <Column style={{ ...card, borderTop: '3px solid #ffc107' }}>
                <Text style={cardVal}>{remainingKg.toLocaleString()}</Text>
                <Text style={cardLbl}>Remaining (kg)</Text>
              </Column>
              {contractsNearExpiry > 0 && (
                <Column style={{ ...card, borderTop: '3px solid #dc3545' }}>
                  <Text style={cardVal}>{contractsNearExpiry}</Text>
                  <Text style={cardLbl}>Near Expiry</Text>
                </Column>
              )}
            </Row>
          </Section>

          {contractSummary.length > 0 && (
            <Section style={{ margin: '0 25px 14px' }}>
              <Text style={miniTitle}>Active Contracts</Text>
              <Section style={tHead}>
                <Row>
                  <Column style={{ ...thCell, width: '25%' }}>Buyer</Column>
                  <Column style={{ ...thCell, width: '18%' }}>Ref</Column>
                  <Column style={{ ...thCell, width: '17%' }}>Total</Column>
                  <Column style={{ ...thCell, width: '17%' }}>Allocated</Column>
                  <Column style={{ ...thCell, width: '13%' }}>Left</Column>
                  <Column style={{ ...thCell, width: '10%' }}>Status</Column>
                </Row>
              </Section>
              {contractSummary.slice(0, 8).map((c, i) => (
                <Section key={i} style={i % 2 === 0 ? trEven : trOdd}>
                  <Row>
                    <Column style={{ ...tdCell, width: '25%' }}>{c.buyer}</Column>
                    <Column style={{ ...tdCell, width: '18%' }}>{c.contractRef}</Column>
                    <Column style={{ ...tdCell, width: '17%' }}>{c.totalKg.toLocaleString()}</Column>
                    <Column style={{ ...tdCell, width: '17%' }}>{c.allocatedKg.toLocaleString()}</Column>
                    <Column style={{ ...tdCell, width: '13%' }}>{c.remaining.toLocaleString()}</Column>
                    <Column style={{ ...tdCell, width: '10%' }}>{c.status}</Column>
                  </Row>
                </Section>
              ))}
            </Section>
          )}

          {actionItems.length > 0 && (
            <Section style={alertBox}>
              <Text style={{ fontSize: '13px', fontWeight: '700', color: '#856404', margin: '0 0 4px' }}>⚠️ Action Required</Text>
              {actionItems.map((a, i) => <Text key={i} style={{ fontSize: '13px', color: '#856404', margin: '0 0 3px' }}>• {a}</Text>)}
            </Section>
          )}

          <Section style={footer}>
            <Text style={footerText}>Automated sales & contracts summary — {SITE_NAME}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SalesSummaryEmail,
  subject: (data: Record<string, any>) =>
    `📊 Sales & Contracts Report — ${data.reportDate || 'Today'} | ${data.salesToday || 0} Sales`,
  displayName: 'Sales Daily Summary',
  previewData: {
    recipientName: 'Taufiq', reportDate: 'Saturday, April 5, 2026',
    salesToday: 2, salesRevenueToday: 45000000, salesKgToday: 18000,
    activeContracts: 5, contractsNearExpiry: 1, totalContractedKg: 200000, fulfilledKg: 120000, remainingKg: 80000,
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
const secHdr = { padding: '0 25px', marginBottom: '8px' }
const secTitle = { fontSize: '14px', fontWeight: '700', color: '#1a1a1a', margin: '0' }
const cardsRow = { padding: '0 20px', marginBottom: '12px' }
const card = { backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '12px 6px', textAlign: 'center' as const, margin: '0 2px', width: '23%' }
const cardVal = { fontSize: '18px', fontWeight: '800', color: '#1a1a1a', margin: '0' }
const cardLbl = { fontSize: '9px', fontWeight: '600', color: '#666', margin: '3px 0 1px', textTransform: 'uppercase' as const }
const cardSubText = { fontSize: '9px', color: '#999', margin: '0' }
const divider = { borderColor: '#e9ecef', margin: '12px 25px' }
const miniTitle = { fontSize: '12px', fontWeight: '700', color: '#555', margin: '0 0 6px', textTransform: 'uppercase' as const }
const tHead = { backgroundColor: '#1a5632', borderRadius: '4px 4px 0 0' }
const thCell = { fontSize: '10px', fontWeight: '700', color: '#fff', padding: '6px 4px', textTransform: 'uppercase' as const }
const trEven = { backgroundColor: '#f8f9fa' }
const trOdd = { backgroundColor: '#ffffff', borderBottom: '1px solid #eee' }
const tdCell = { fontSize: '11px', color: '#333', padding: '6px 4px' }
const alertBox = { backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '12px 16px', margin: '12px 25px' }
const footer = { padding: '16px 25px 24px', textAlign: 'center' as const, backgroundColor: '#f8f9fa', borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
