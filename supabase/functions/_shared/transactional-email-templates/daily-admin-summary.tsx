/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Row, Column, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Agro Coffee'

interface AdminSummaryProps {
  recipientName?: string
  reportDate?: string
  // Inventory
  availableStockKg?: number
  inventoryBatches?: number
  inventoryKg?: number
  pendingAssessment?: number
  pendingAssessmentKg?: number
  assessedBatches?: number
  rejectedLots?: number
  // Purchases
  purchasesToday?: number
  purchasesKgToday?: number
  purchasesYesterday?: number
  purchasesKgYesterday?: number
  // Sales
  salesToday?: number
  salesAmountToday?: number
  salesKgToday?: number
  // Approvals
  pendingApprovals?: number
  approvedToday?: number
  rejectedApprovalToday?: number
  // Withdrawals
  withdrawalsToday?: number
  withdrawalsAmountToday?: number
  // EUDR Dispatch
  dispatchesToday?: number
  totalDispatchedKg?: number
  // Field Operations
  fieldReportsToday?: number
  totalKgMobilized?: number
  villagesVisited?: number
  // Milling
  millingToday?: number
  millingKgToday?: number
  // Top items
  topPendingApprovals?: Array<{ title: string; type: string; amount: number; requestedBy: string }>
  recentSales?: Array<{ customer: string; coffeeType: string; weight: number; amount: number }>
  recentPurchases?: Array<{ supplier: string; coffeeType: string; kg: number; date: string }>
}

const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
  <Column style={{ ...statCard, borderTop: `3px solid ${color}` }}>
    <Text style={statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
    <Text style={statLabel}>{label}</Text>
    {sub && <Text style={statSub}>{sub}</Text>}
  </Column>
)

const AdminSummaryEmail = (props: AdminSummaryProps) => {
  const {
    recipientName = 'Admin',
    reportDate = new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    availableStockKg = 0, inventoryBatches = 0, inventoryKg = 0,
    pendingAssessment = 0, pendingAssessmentKg = 0, assessedBatches = 0, rejectedLots = 0,
    purchasesToday = 0, purchasesKgToday = 0, purchasesYesterday = 0, purchasesKgYesterday = 0,
    salesToday = 0, salesAmountToday = 0, salesKgToday = 0,
    pendingApprovals = 0, approvedToday = 0, rejectedApprovalToday = 0,
    withdrawalsToday = 0, withdrawalsAmountToday = 0,
    dispatchesToday = 0, totalDispatchedKg = 0,
    fieldReportsToday = 0, totalKgMobilized = 0, villagesVisited = 0,
    millingToday = 0, millingKgToday = 0,
    topPendingApprovals = [], recentSales = [], recentPurchases = [],
  } = props

  const purchaseChange = purchasesKgYesterday > 0
    ? Math.round(((purchasesKgToday - purchasesKgYesterday) / purchasesKgYesterday) * 100)
    : 0
  const purchaseChangeText = purchaseChange > 0 ? `↑ ${purchaseChange}%` : purchaseChange < 0 ? `↓ ${Math.abs(purchaseChange)}%` : '—'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Daily Admin Report — {reportDate} | Stock: {availableStockKg.toLocaleString()}kg | {pendingApprovals} pending approvals</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={{ fontSize: '32px', margin: '0 0 6px' }}>☕</Text>
            <Heading style={headerTitle}>{SITE_NAME}</Heading>
            <Text style={headerSub}>Executive Daily Report</Text>
          </Section>
          <Section style={dateBanner}>
            <Text style={dateText}>{reportDate}</Text>
          </Section>

          <Text style={greetText}>Good evening {recipientName},</Text>
          <Text style={introText}>Here's your comprehensive daily business summary across all departments.</Text>

          {/* ─── INVENTORY & STOCK ─── */}
          <Section style={sectionHeader}>
            <Text style={sectionIcon}>📦</Text>
            <Text style={sectionTitleText}>Inventory & Stock Overview</Text>
          </Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Available Stock" value={`${(availableStockKg / 1000).toFixed(1)}t`} sub={`${availableStockKg.toLocaleString()} kg`} color="#28a745" />
              <StatCard label="In Store" value={inventoryBatches} sub={`${inventoryKg.toLocaleString()} kg`} color="#17a2b8" />
              <StatCard label="Pending QC" value={pendingAssessment} sub={`${pendingAssessmentKg.toLocaleString()} kg`} color="#ffc107" />
              <StatCard label="Rejected" value={rejectedLots} color="#dc3545" />
            </Row>
          </Section>

          <Hr style={divider} />

          {/* ─── PURCHASES ─── */}
          <Section style={sectionHeader}>
            <Text style={sectionIcon}>🛒</Text>
            <Text style={sectionTitleText}>Today's Purchases vs Yesterday</Text>
          </Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Today Purchases" value={purchasesToday} sub={`${purchasesKgToday.toLocaleString()} kg`} color="#1a5632" />
              <StatCard label="Yesterday" value={purchasesYesterday} sub={`${purchasesKgYesterday.toLocaleString()} kg`} color="#6c757d" />
              <StatCard label="Change" value={purchaseChangeText} sub="vs yesterday" color={purchaseChange >= 0 ? '#28a745' : '#dc3545'} />
            </Row>
          </Section>

          {recentPurchases.length > 0 && (
            <Section style={{ margin: '0 25px 16px' }}>
              <Text style={miniTableTitle}>Recent Purchases</Text>
              <Section style={tHead}>
                <Row>
                  <Column style={{ ...thCell, width: '35%' }}>Supplier</Column>
                  <Column style={{ ...thCell, width: '25%' }}>Type</Column>
                  <Column style={{ ...thCell, width: '20%' }}>Weight</Column>
                  <Column style={{ ...thCell, width: '20%' }}>Date</Column>
                </Row>
              </Section>
              {recentPurchases.slice(0, 8).map((p, i) => (
                <Section key={i} style={i % 2 === 0 ? trEven : trOdd}>
                  <Row>
                    <Column style={{ ...tdCell, width: '35%' }}>{p.supplier}</Column>
                    <Column style={{ ...tdCell, width: '25%' }}>{p.coffeeType}</Column>
                    <Column style={{ ...tdCell, width: '20%' }}>{p.kg.toLocaleString()} kg</Column>
                    <Column style={{ ...tdCell, width: '20%' }}>{p.date}</Column>
                  </Row>
                </Section>
              ))}
            </Section>
          )}

          <Hr style={divider} />

          {/* ─── SALES ─── */}
          <Section style={sectionHeader}>
            <Text style={sectionIcon}>💰</Text>
            <Text style={sectionTitleText}>Sales Performance</Text>
          </Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Sales Today" value={salesToday} sub={`${salesKgToday.toLocaleString()} kg`} color="#28a745" />
              <StatCard label="Revenue" value={`UGX ${(salesAmountToday / 1000000).toFixed(1)}M`} sub={salesAmountToday.toLocaleString()} color="#1a5632" />
            </Row>
          </Section>

          {recentSales.length > 0 && (
            <Section style={{ margin: '0 25px 16px' }}>
              <Text style={miniTableTitle}>Recent Sales</Text>
              <Section style={tHead}>
                <Row>
                  <Column style={{ ...thCell, width: '30%' }}>Customer</Column>
                  <Column style={{ ...thCell, width: '25%' }}>Type</Column>
                  <Column style={{ ...thCell, width: '20%' }}>Weight</Column>
                  <Column style={{ ...thCell, width: '25%' }}>Amount</Column>
                </Row>
              </Section>
              {recentSales.slice(0, 5).map((s, i) => (
                <Section key={i} style={i % 2 === 0 ? trEven : trOdd}>
                  <Row>
                    <Column style={{ ...tdCell, width: '30%' }}>{s.customer}</Column>
                    <Column style={{ ...tdCell, width: '25%' }}>{s.coffeeType}</Column>
                    <Column style={{ ...tdCell, width: '20%' }}>{s.weight.toLocaleString()} kg</Column>
                    <Column style={{ ...tdCell, width: '25%' }}>UGX {s.amount.toLocaleString()}</Column>
                  </Row>
                </Section>
              ))}
            </Section>
          )}

          <Hr style={divider} />

          {/* ─── APPROVALS & WITHDRAWALS ─── */}
          <Section style={sectionHeader}>
            <Text style={sectionIcon}>✅</Text>
            <Text style={sectionTitleText}>Approvals & Withdrawals</Text>
          </Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Pending Approvals" value={pendingApprovals} color="#ffc107" />
              <StatCard label="Approved Today" value={approvedToday} color="#28a745" />
              <StatCard label="Rejected Today" value={rejectedApprovalToday} color="#dc3545" />
              <StatCard label="Withdrawals" value={withdrawalsToday} sub={`UGX ${withdrawalsAmountToday.toLocaleString()}`} color="#6f42c1" />
            </Row>
          </Section>

          {topPendingApprovals.length > 0 && (
            <Section style={{ margin: '0 25px 16px' }}>
              <Text style={miniTableTitle}>⏳ Pending Approvals Requiring Action</Text>
              <Section style={tHead}>
                <Row>
                  <Column style={{ ...thCell, width: '35%' }}>Title</Column>
                  <Column style={{ ...thCell, width: '20%' }}>Type</Column>
                  <Column style={{ ...thCell, width: '20%' }}>Amount</Column>
                  <Column style={{ ...thCell, width: '25%' }}>Requested By</Column>
                </Row>
              </Section>
              {topPendingApprovals.slice(0, 5).map((a, i) => (
                <Section key={i} style={i % 2 === 0 ? trEven : trOdd}>
                  <Row>
                    <Column style={{ ...tdCell, width: '35%' }}>{a.title}</Column>
                    <Column style={{ ...tdCell, width: '20%' }}>{a.type}</Column>
                    <Column style={{ ...tdCell, width: '20%' }}>UGX {a.amount.toLocaleString()}</Column>
                    <Column style={{ ...tdCell, width: '25%' }}>{a.requestedBy}</Column>
                  </Row>
                </Section>
              ))}
            </Section>
          )}

          <Hr style={divider} />

          {/* ─── EUDR & DISPATCH ─── */}
          <Section style={sectionHeader}>
            <Text style={sectionIcon}>🚛</Text>
            <Text style={sectionTitleText}>EUDR & Dispatch</Text>
          </Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Dispatches Today" value={dispatchesToday} color="#17a2b8" />
              <StatCard label="Dispatched Weight" value={`${totalDispatchedKg.toLocaleString()} kg`} color="#1a5632" />
            </Row>
          </Section>

          <Hr style={divider} />

          {/* ─── FIELD OPERATIONS ─── */}
          <Section style={sectionHeader}>
            <Text style={sectionIcon}>🌾</Text>
            <Text style={sectionTitleText}>Field Operations</Text>
          </Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Field Reports" value={fieldReportsToday} color="#28a745" />
              <StatCard label="Kg Mobilized" value={totalKgMobilized.toLocaleString()} color="#1a5632" />
              <StatCard label="Villages Visited" value={villagesVisited} color="#17a2b8" />
            </Row>
          </Section>

          <Hr style={divider} />

          {/* ─── MILLING ─── */}
          <Section style={sectionHeader}>
            <Text style={sectionIcon}>⚙️</Text>
            <Text style={sectionTitleText}>Milling & Processing</Text>
          </Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Milling Sessions" value={millingToday} color="#6c757d" />
              <StatCard label="Processed" value={`${millingKgToday.toLocaleString()} kg`} color="#1a5632" />
            </Row>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>This is an automated executive summary from {SITE_NAME}.</Text>
            <Text style={footerText}>Login to the system for detailed views and actions.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminSummaryEmail,
  subject: (data: Record<string, any>) =>
    `📊 Daily Business Report — ${data.reportDate || 'Today'} | ${data.pendingApprovals || 0} Pending Approvals`,
  displayName: 'Admin Daily Summary',
  previewData: {
    recipientName: 'Fauza',
    reportDate: 'Saturday, April 5, 2026',
    availableStockKg: 520139, inventoryBatches: 72, inventoryKg: 34249,
    pendingAssessment: 87, pendingAssessmentKg: 67843, assessedBatches: 546, rejectedLots: 5,
    purchasesToday: 11, purchasesKgToday: 3534, purchasesYesterday: 38, purchasesKgYesterday: 12800,
    salesToday: 2, salesAmountToday: 45000000, salesKgToday: 18000,
    pendingApprovals: 3, approvedToday: 5, rejectedApprovalToday: 1,
    withdrawalsToday: 4, withdrawalsAmountToday: 2500000,
    dispatchesToday: 1, totalDispatchedKg: 18000,
    fieldReportsToday: 2, totalKgMobilized: 1200, villagesVisited: 6,
    millingToday: 1, millingKgToday: 5000,
  },
} satisfies TemplateEntry

// ──── Styles ────
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '640px', margin: '0 auto' }

const header = { backgroundColor: '#1a5632', padding: '28px 25px 18px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerTitle = { fontSize: '20px', fontWeight: '700', color: '#fff', margin: '0 0 4px' }
const headerSub = { fontSize: '12px', color: '#b8d4c5', margin: '0', letterSpacing: '1.5px', textTransform: 'uppercase' as const }

const dateBanner = { backgroundColor: '#f0f7f3', padding: '8px 25px', borderBottom: '2px solid #1a5632' }
const dateText = { fontSize: '13px', color: '#1a5632', margin: '0', fontWeight: '600', textAlign: 'center' as const }

const greetText = { fontSize: '15px', color: '#1a1a1a', margin: '20px 25px 6px', fontWeight: '600' }
const introText = { fontSize: '13px', color: '#666', margin: '0 25px 18px', lineHeight: '1.5' }

const sectionHeader = { padding: '0 25px', marginBottom: '10px' }
const sectionIcon = { fontSize: '16px', display: 'inline' as const, margin: '0 6px 0 0' }
const sectionTitleText = { fontSize: '15px', fontWeight: '700', color: '#1a1a1a', margin: '0', display: 'inline' as const }

const cardsRow = { padding: '0 20px', marginBottom: '14px' }
const statCard = {
  backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '12px 8px',
  textAlign: 'center' as const, margin: '0 3px', width: '23%',
}
const statValue = { fontSize: '20px', fontWeight: '800', color: '#1a1a1a', margin: '0' }
const statLabel = { fontSize: '10px', fontWeight: '600', color: '#666', margin: '3px 0 1px', textTransform: 'uppercase' as const }
const statSub = { fontSize: '10px', color: '#999', margin: '0' }

const divider = { borderColor: '#e9ecef', margin: '12px 25px' }

const miniTableTitle = { fontSize: '12px', fontWeight: '700', color: '#555', margin: '0 0 6px', textTransform: 'uppercase' as const }
const tHead = { backgroundColor: '#1a5632', borderRadius: '4px 4px 0 0' }
const thCell = { fontSize: '10px', fontWeight: '700', color: '#fff', padding: '6px 5px', textTransform: 'uppercase' as const }
const trEven = { backgroundColor: '#f8f9fa' }
const trOdd = { backgroundColor: '#ffffff', borderBottom: '1px solid #eee' }
const tdCell = { fontSize: '11px', color: '#333', padding: '6px 5px' }

const footer = { padding: '18px 25px 28px', textAlign: 'center' as const, backgroundColor: '#f8f9fa', borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0 0 3px' }
