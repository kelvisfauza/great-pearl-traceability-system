/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Row, Column, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface ProcurementSummaryProps {
  recipientName?: string
  reportDate?: string
  activeBuyerContracts?: number
  totalContractedKg?: number
  fulfilledKg?: number
  remainingKg?: number
  nearExpiryContracts?: Array<{ buyer: string; ref: string; endDate: string; remaining: number }>
  activeBookings?: number
  bookingsOverdue?: number
  overdueBookings?: Array<{ supplier: string; bookedKg: number; deliveredKg: number; expiryDate: string }>
  openAdvances?: number
  totalOutstandingAdvances?: number
  advancesDetail?: Array<{ supplier: string; amount: number; outstanding: number }>
  inactiveSuppliers?: Array<{ name: string; lastDelivery: string; daysSince: number }>
  inactiveCount?: number
  highlights?: string[]
  actionItems?: string[]
}

const ProcurementSummaryEmail = (props: ProcurementSummaryProps) => {
  const {
    recipientName = 'Team', reportDate = new Date().toLocaleDateString(),
    activeBuyerContracts = 0, totalContractedKg = 0, fulfilledKg = 0, remainingKg = 0,
    nearExpiryContracts = [], activeBookings = 0, bookingsOverdue = 0, overdueBookings = [],
    openAdvances = 0, totalOutstandingAdvances = 0, advancesDetail = [],
    inactiveSuppliers = [], inactiveCount = 0, highlights = [], actionItems = [],
  } = props

  const fulfillmentPct = totalContractedKg > 0 ? Math.round((fulfilledKg / totalContractedKg) * 100) : 0

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>📦 Procurement Report — {reportDate} • {inactiveCount} inactive suppliers</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Company Header */}
          <Section style={companyHeader}>
            <Img src={LOGO_URL} alt={SITE_NAME} width="50" height="50" style={logoStyle} />
            <Heading style={companyName}>{SITE_NAME}</Heading>
            <Text style={reportTitle}>PROCUREMENT DAILY REPORT</Text>
            <Text style={reportDateStyle}>{reportDate}</Text>
          </Section>

          {/* Greeting */}
          <Section style={bodySection}>
            <Text style={greeting}>Hi {recipientName},</Text>
            <Text style={introText}>Here's your procurement overview for today. Items requiring attention are highlighted.</Text>
          </Section>

          {/* Quick Stats */}
          <Section style={statsBar}>
            <table style={statsTable}>
              <tr>
                <td style={statCell}>
                  <Text style={statNum}>{activeBuyerContracts}</Text>
                  <Text style={statLbl}>Buyer Contracts</Text>
                </td>
                <td style={statCell}>
                  <Text style={statNum}>{remainingKg.toLocaleString()}</Text>
                  <Text style={statLbl}>Kg Remaining</Text>
                </td>
                <td style={statCell}>
                  <Text style={statNum}>{activeBookings}</Text>
                  <Text style={statLbl}>Bookings</Text>
                </td>
                <td style={statCellAlert}>
                  <Text style={statNumAlert}>{inactiveCount}</Text>
                  <Text style={statLbl}>Inactive Suppliers</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* ── ACTION ITEMS ── */}
          {actionItems.length > 0 && (
            <Section style={alertBox}>
              <Text style={alertTitle}>🎯 REQUIRES YOUR ATTENTION</Text>
              {actionItems.map((item, i) => (
                <Text key={i} style={alertItem}>▸ {item}</Text>
              ))}
            </Section>
          )}

          {/* ── INACTIVE SUPPLIERS ── */}
          {inactiveSuppliers.length > 0 && (
            <Section style={sectionBlock}>
              <Text style={sectionTitle}>⚠️ INACTIVE SUPPLIERS ({inactiveCount})</Text>
              <Text style={sectionDesc}>
                These suppliers have not delivered any coffee in the last 3 weeks. Consider investigating.
              </Text>
              <table style={dataTable}>
                <thead>
                  <tr>
                    <th style={thCell}>Supplier Name</th>
                    <th style={thCell}>Last Delivery</th>
                    <th style={thCellRight}>Days Inactive</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveSuppliers.slice(0, 20).map((s, i) => (
                    <tr key={i}>
                      <td style={tdCell}>{s.name}</td>
                      <td style={tdCell}>{s.lastDelivery}</td>
                      <td style={{...tdCellRight, color: s.daysSince > 60 ? '#c62828' : s.daysSince > 30 ? '#e65100' : '#333'}}>
                        {s.daysSince} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inactiveSuppliers.length > 20 && (
                <Text style={moreText}>...and {inactiveSuppliers.length - 20} more inactive suppliers</Text>
              )}
            </Section>
          )}

          {/* ── BUYER CONTRACTS ── */}
          <Section style={sectionBlock}>
            <Text style={sectionTitle}>📋 BUYER CONTRACTS</Text>
            <table style={summaryRow}>
              <tr>
                <td style={summaryCell}><strong>{activeBuyerContracts}</strong> active</td>
                <td style={summaryCell}><strong>{totalContractedKg.toLocaleString()}</strong> kg total</td>
                <td style={summaryCell}><strong>{fulfillmentPct}%</strong> fulfilled</td>
                <td style={summaryCell}><strong>{remainingKg.toLocaleString()}</strong> kg left</td>
              </tr>
            </table>
            {nearExpiryContracts.length > 0 && (
              <>
                <Text style={warningLabel}>Contracts needing attention:</Text>
                <table style={dataTable}>
                  <thead>
                    <tr>
                      <th style={thCell}>Buyer</th>
                      <th style={thCell}>Ref</th>
                      <th style={thCell}>End Date</th>
                      <th style={thCellRight}>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nearExpiryContracts.map((c, i) => (
                      <tr key={i}>
                        <td style={tdCell}>{c.buyer}</td>
                        <td style={tdCell}>{c.ref}</td>
                        <td style={tdCell}>{c.endDate}</td>
                        <td style={tdCellRight}>{c.remaining.toLocaleString()} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Section>

          {/* ── COFFEE BOOKINGS ── */}
          <Section style={sectionBlock}>
            <Text style={sectionTitle}>📝 COFFEE BOOKINGS</Text>
            <Text style={sectionDesc}>
              {activeBookings} active bookings • {bookingsOverdue} overdue
            </Text>
            {overdueBookings.length > 0 && (
              <>
                <Text style={warningLabel}>🚨 Overdue bookings:</Text>
                <table style={dataTable}>
                  <thead>
                    <tr>
                      <th style={thCell}>Supplier</th>
                      <th style={thCell}>Delivered / Booked</th>
                      <th style={thCell}>Expired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueBookings.map((b, i) => (
                      <tr key={i}>
                        <td style={tdCell}>{b.supplier}</td>
                        <td style={tdCell}>{b.deliveredKg.toLocaleString()} / {b.bookedKg.toLocaleString()} kg</td>
                        <td style={{...tdCell, color: '#c62828'}}>{b.expiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Section>

          {/* ── SUPPLIER ADVANCES ── */}
          {openAdvances > 0 && (
            <Section style={sectionBlock}>
              <Text style={sectionTitle}>💰 OUTSTANDING SUPPLIER ADVANCES</Text>
              <Text style={sectionDesc}>
                {openAdvances} open • UGX {totalOutstandingAdvances.toLocaleString()} total outstanding
              </Text>
              <table style={dataTable}>
                <thead>
                  <tr>
                    <th style={thCell}>Supplier</th>
                    <th style={thCellRight}>Advance (UGX)</th>
                    <th style={thCellRight}>Outstanding (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {advancesDetail.map((a, i) => (
                    <tr key={i}>
                      <td style={tdCell}>{a.supplier}</td>
                      <td style={tdCellRight}>{a.amount.toLocaleString()}</td>
                      <td style={{...tdCellRight, color: '#c62828', fontWeight: '600'}}>{a.outstanding.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── HIGHLIGHTS ── */}
          {highlights.length > 0 && (
            <Section style={highlightBox}>
              <Text style={highlightTitle}>✅ HIGHLIGHTS</Text>
              {highlights.map((h, i) => (
                <Text key={i} style={highlightItem}>• {h}</Text>
              ))}
            </Section>
          )}

          {/* Footer */}
          <Section style={footerSection}>
            <Hr style={footerHr} />
            <Text style={footerText}>
              This is an automated daily procurement report from {SITE_NAME}.<br/>
              Generated at {new Date().toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' })} EAT
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProcurementSummaryEmail,
  subject: (data: Record<string, any>) => `📦 Procurement Report — ${data.reportDate || 'Today'} • ${data.inactiveCount || 0} inactive suppliers`,
  displayName: 'Daily Procurement Summary',
  previewData: {
    recipientName: 'Timothy',
    reportDate: 'Monday, 7 April 2026',
    activeBuyerContracts: 5,
    totalContractedKg: 120000,
    fulfilledKg: 45000,
    remainingKg: 75000,
    nearExpiryContracts: [{ buyer: 'Olam', ref: 'BC-001', endDate: '15 Apr 2026', remaining: 12000 }],
    activeBookings: 3,
    bookingsOverdue: 1,
    overdueBookings: [{ supplier: 'Kambasu', bookedKg: 5000, deliveredKg: 3200, expiryDate: '01 Apr 2026' }],
    openAdvances: 2,
    totalOutstandingAdvances: 1500000,
    advancesDetail: [{ supplier: 'Nzanzu', amount: 1000000, outstanding: 800000 }],
    inactiveSuppliers: [
      { name: 'Monday Kyondo', lastDelivery: '10 Mar 2026', daysSince: 28 },
      { name: 'Kule James', lastDelivery: '28 Feb 2026', daysSince: 38 },
      { name: 'Baluku Peter', lastDelivery: '15 Jan 2026', daysSince: 82 },
    ],
    inactiveCount: 12,
    highlights: ['5 active buyer contracts with 75,000 kg remaining', '3 active coffee bookings'],
    actionItems: ['Follow up on 1 overdue booking from Kambasu', 'Investigate 12 inactive suppliers', '2 buyer contracts nearing expiry'],
  },
} satisfies TemplateEntry

// ── Styles ──
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '620px', margin: '0 auto' }

// Company Header
const companyHeader = { backgroundColor: '#1a5632', padding: '24px 28px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const logoStyle = { borderRadius: '8px', margin: '0 auto 8px' }
const companyName = { fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 4px' }
const reportTitle = { fontSize: '14px', fontWeight: '600', color: '#a8d5ba', margin: '0 0 2px', letterSpacing: '1px' }
const reportDateStyle = { fontSize: '12px', color: '#88c4a0', margin: '0' }

// Body
const bodySection = { padding: '20px 28px 0' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 6px', fontWeight: '600' }
const introText = { fontSize: '13px', color: '#666', margin: '0 0 12px', lineHeight: '1.5' }

// Stats
const statsBar = { padding: '0 28px', margin: '0 0 8px' }
const statsTable = { width: '100%', borderCollapse: 'collapse' as const, backgroundColor: '#f8faf9', borderRadius: '8px', overflow: 'hidden' }
const statCell = { textAlign: 'center' as const, padding: '12px 8px', borderRight: '1px solid #e8ede9' }
const statCellAlert = { textAlign: 'center' as const, padding: '12px 8px', backgroundColor: '#fff3e0' }
const statNum = { fontSize: '20px', fontWeight: '700', color: '#1a5632', margin: '0' }
const statNumAlert = { fontSize: '20px', fontWeight: '700', color: '#e65100', margin: '0' }
const statLbl = { fontSize: '10px', color: '#888', margin: '2px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.3px' }

// Alert Box
const alertBox = { margin: '12px 28px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '14px 18px', borderLeft: '4px solid #dc2626' }
const alertTitle = { fontSize: '13px', fontWeight: '700', color: '#991b1b', margin: '0 0 8px', letterSpacing: '0.5px' }
const alertItem = { fontSize: '13px', color: '#7f1d1d', margin: '3px 0', lineHeight: '1.5' }

// Section blocks
const sectionBlock = { padding: '0 28px', margin: '16px 0' }
const sectionTitle = { fontSize: '14px', fontWeight: '700', color: '#1a5632', margin: '0 0 6px', letterSpacing: '0.3px', borderBottom: '2px solid #d4edda', paddingBottom: '6px' }
const sectionDesc = { fontSize: '13px', color: '#555', margin: '0 0 10px', lineHeight: '1.4' }
const warningLabel = { fontSize: '12px', fontWeight: '600', color: '#b45309', margin: '8px 0 6px' }

// Data tables
const dataTable = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px', marginBottom: '8px' }
const thCell = { backgroundColor: '#f0f7f3', padding: '8px 10px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '600', color: '#1a5632', borderBottom: '2px solid #c8e6c9', textTransform: 'uppercase' as const, letterSpacing: '0.3px' }
const thCellRight = { ...thCell, textAlign: 'right' as const }
const tdCell = { padding: '7px 10px', borderBottom: '1px solid #eee', fontSize: '12px', color: '#333' }
const tdCellRight = { ...tdCell, textAlign: 'right' as const }
const summaryRow = { width: '100%', borderCollapse: 'collapse' as const, marginBottom: '10px' }
const summaryCell = { padding: '6px 8px', fontSize: '12px', color: '#555', textAlign: 'center' as const, backgroundColor: '#f8faf9', border: '1px solid #e8ede9' }
const moreText = { fontSize: '11px', color: '#999', margin: '4px 0 0', fontStyle: 'italic' as const }

// Highlight
const highlightBox = { margin: '12px 28px', backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '14px 18px', border: '1px solid #c8e6c9' }
const highlightTitle = { fontSize: '13px', fontWeight: '700', color: '#1a5632', margin: '0 0 6px', letterSpacing: '0.5px' }
const highlightItem = { fontSize: '12px', color: '#2d6a4f', margin: '3px 0', lineHeight: '1.5' }

// Footer
const footerSection = { padding: '0 28px 20px' }
const footerHr = { borderColor: '#e0e0e0', margin: '16px 0 12px' }
const footerText = { fontSize: '11px', color: '#aaa', textAlign: 'center' as const, margin: '0', lineHeight: '1.5' }
