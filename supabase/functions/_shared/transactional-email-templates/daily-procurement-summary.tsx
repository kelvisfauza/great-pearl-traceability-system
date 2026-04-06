/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Row, Column, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface ProcurementSummaryProps {
  recipientName?: string
  reportDate?: string
  // Buyer Contracts
  activeBuyerContracts?: number
  totalContractedKg?: number
  fulfilledKg?: number
  remainingKg?: number
  nearExpiryContracts?: Array<{ buyer: string; ref: string; endDate: string; remaining: number }>
  // Coffee Bookings
  activeBookings?: number
  bookingsOverdue?: number
  overdueBookings?: Array<{ supplier: string; bookedKg: number; deliveredKg: number; expiryDate: string }>
  // Supplier Advances
  openAdvances?: number
  totalOutstandingAdvances?: number
  advancesDetail?: Array<{ supplier: string; amount: number; outstanding: number }>
  // Inactive Suppliers
  inactiveSuppliers?: Array<{ name: string; lastDelivery: string; daysSince: number }>
  inactiveCount?: number
  // Highlights & Actions
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

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Procurement Daily Summary — {reportDate}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📦 Procurement Summary</Heading>
          <Text style={dateText}>{reportDate}</Text>
          <Text style={greeting}>Hi {recipientName},</Text>
          <Text style={text}>Here's your daily procurement overview:</Text>

          {/* Summary Stats */}
          <Section style={statsSection}>
            <Row>
              <Column style={statBox}>
                <Text style={statNumber}>{activeBuyerContracts}</Text>
                <Text style={statLabel}>Buyer Contracts</Text>
              </Column>
              <Column style={statBox}>
                <Text style={statNumber}>{remainingKg.toLocaleString()}</Text>
                <Text style={statLabel}>Kg Remaining</Text>
              </Column>
              <Column style={statBox}>
                <Text style={statNumber}>{activeBookings}</Text>
                <Text style={statLabel}>Active Bookings</Text>
              </Column>
              <Column style={statBox}>
                <Text style={statNumber}>{inactiveCount}</Text>
                <Text style={statLabel}>Inactive Suppliers</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          {/* Buyer Contracts */}
          <Heading as="h2" style={h2}>📋 Buyer Contracts</Heading>
          <Text style={text}>
            {activeBuyerContracts} active contracts • {totalContractedKg.toLocaleString()} kg total •{' '}
            {fulfilledKg.toLocaleString()} kg fulfilled • {remainingKg.toLocaleString()} kg remaining
          </Text>
          {nearExpiryContracts.length > 0 && (
            <>
              <Text style={warningText}>⚠️ Contracts nearing expiry or low fulfillment:</Text>
              {nearExpiryContracts.map((c, i) => (
                <Text key={i} style={listItem}>
                  • <strong>{c.buyer}</strong> ({c.ref}) — {c.remaining.toLocaleString()} kg left, ends {c.endDate}
                </Text>
              ))}
            </>
          )}

          <Hr style={hr} />

          {/* Coffee Bookings */}
          <Heading as="h2" style={h2}>📝 Coffee Bookings</Heading>
          <Text style={text}>
            {activeBookings} active bookings • {bookingsOverdue} overdue
          </Text>
          {overdueBookings.length > 0 && (
            <>
              <Text style={warningText}>🚨 Overdue bookings (supplier hasn't delivered):</Text>
              {overdueBookings.map((b, i) => (
                <Text key={i} style={listItem}>
                  • <strong>{b.supplier}</strong> — {b.deliveredKg.toLocaleString()}/{b.bookedKg.toLocaleString()} kg delivered, expired {b.expiryDate}
                </Text>
              ))}
            </>
          )}

          <Hr style={hr} />

          {/* Supplier Advances */}
          {openAdvances > 0 && (
            <>
              <Heading as="h2" style={h2}>💰 Outstanding Supplier Advances</Heading>
              <Text style={text}>
                {openAdvances} open advances • UGX {totalOutstandingAdvances.toLocaleString()} outstanding
              </Text>
              {advancesDetail.slice(0, 10).map((a, i) => (
                <Text key={i} style={listItem}>
                  • <strong>{a.supplier}</strong> — Advance: UGX {a.amount.toLocaleString()}, Outstanding: UGX {a.outstanding.toLocaleString()}
                </Text>
              ))}
              <Hr style={hr} />
            </>
          )}

          {/* Inactive Suppliers */}
          {inactiveSuppliers.length > 0 && (
            <>
              <Heading as="h2" style={h2}>⏳ Inactive Suppliers (No delivery in 30+ days)</Heading>
              <Text style={text}>
                {inactiveCount} suppliers haven't delivered recently. Consider investigating:
              </Text>
              {inactiveSuppliers.slice(0, 15).map((s, i) => (
                <Text key={i} style={listItem}>
                  • <strong>{s.name}</strong> — Last delivery: {s.lastDelivery} ({s.daysSince} days ago)
                </Text>
              ))}
              {inactiveSuppliers.length > 15 && (
                <Text style={mutedText}>...and {inactiveSuppliers.length - 15} more inactive suppliers</Text>
              )}
              <Hr style={hr} />
            </>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <>
              <Heading as="h2" style={h2}>🎯 Action Items</Heading>
              {actionItems.map((item, i) => (
                <Text key={i} style={actionItem}>• {item}</Text>
              ))}
              <Hr style={hr} />
            </>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <>
              <Heading as="h2" style={h2}>✅ Highlights</Heading>
              {highlights.map((h, i) => (
                <Text key={i} style={listItem}>• {h}</Text>
              ))}
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            This is an automated daily procurement summary from {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProcurementSummaryEmail,
  subject: (data: Record<string, any>) => `📦 Procurement Daily Summary — ${data.reportDate || new Date().toLocaleDateString()}`,
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
    inactiveSuppliers: [{ name: 'Monday Kyondo', lastDelivery: '30 Sep 2025', daysSince: 189 }],
    inactiveCount: 5,
    highlights: ['5 active buyer contracts with 75,000 kg remaining'],
    actionItems: ['Follow up on 1 overdue booking from Kambasu', 'Investigate 5 inactive suppliers'],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a1a', margin: '0 0 4px' }
const h2 = { fontSize: '16px', fontWeight: '600' as const, color: '#1a1a1a', margin: '20px 0 8px' }
const dateText = { fontSize: '13px', color: '#888', margin: '0 0 16px' }
const greeting = { fontSize: '14px', color: '#333', margin: '0 0 4px' }
const text = { fontSize: '14px', color: '#555', lineHeight: '1.5', margin: '0 0 12px' }
const warningText = { fontSize: '13px', color: '#b45309', fontWeight: '600' as const, margin: '8px 0 4px' }
const listItem = { fontSize: '13px', color: '#444', lineHeight: '1.6', margin: '2px 0', paddingLeft: '8px' }
const actionItem = { fontSize: '13px', color: '#b91c1c', lineHeight: '1.6', margin: '2px 0', paddingLeft: '8px', fontWeight: '500' as const }
const mutedText = { fontSize: '12px', color: '#999', margin: '4px 0 0', paddingLeft: '8px' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '11px', color: '#aaa', margin: '24px 0 0', textAlign: 'center' as const }
const statsSection = { margin: '16px 0' }
const statBox = { textAlign: 'center' as const, padding: '8px' }
const statNumber = { fontSize: '22px', fontWeight: '700' as const, color: '#16a34a', margin: '0' }
const statLabel = { fontSize: '11px', color: '#888', margin: '2px 0 0', textTransform: 'uppercase' as const }
