import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface InventoryEntry {
  batch_number: string
  coffee_type: string
  kilograms: number
  suppliers: string
  avg_price: number
}

interface Props {
  recipientName?: string
  reportDate?: string
  totalKg?: number
  totalBatches?: number
  avgPricePerKg?: number
  entries?: InventoryEntry[]
}

const DailyInventorySummaryEmail = ({
  recipientName = 'Admin',
  reportDate = 'Today',
  totalKg = 0,
  totalBatches = 0,
  avgPricePerKg = 0,
  entries = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>📦 Daily Inventory: {totalKg.toLocaleString()} kg across {totalBatches} batches — {reportDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>📦</Text>
          <Heading style={h1}>Daily Inventory Summary</Heading>
          <Text style={subtitle}>{SITE_NAME} — {reportDate}</Text>
        </Section>

        <Hr style={divider} />

        <Section style={content}>
          <Text style={greeting}>Hi {recipientName},</Text>
          <Text style={text}>Here's today's inventory intake summary:</Text>

          <Section style={statsRow}>
            <Section style={statBox}>
              <Text style={statValue}>{totalBatches}</Text>
              <Text style={statLabel}>Batches</Text>
            </Section>
            <Section style={statBox}>
              <Text style={statValue}>{totalKg.toLocaleString()}</Text>
              <Text style={statLabel}>Total Kg</Text>
            </Section>
            <Section style={statBox}>
              <Text style={statValue}>UGX {avgPricePerKg.toLocaleString()}</Text>
              <Text style={statLabel}>Avg Price/Kg</Text>
            </Section>
          </Section>

          {entries.length > 0 && (
            <Section style={tableSection}>
              <Text style={tableTitle}>📋 Batch Details</Text>
              <Section style={tableHeader}>
                <Text style={thCell}>Batch</Text>
                <Text style={thCell}>Type</Text>
                <Text style={thCell}>Kg</Text>
                <Text style={thCell}>Avg Price</Text>
                <Text style={thCell}>Suppliers</Text>
              </Section>
              {entries.map((entry, idx) => (
                <Section key={idx} style={idx % 2 === 0 ? tableRowEven : tableRowOdd}>
                  <Text style={tdCell}>{entry.batch_number}</Text>
                  <Text style={tdCell}>{entry.coffee_type}</Text>
                  <Text style={tdCell}>{entry.kilograms.toLocaleString()}</Text>
                  <Text style={tdCell}>UGX {entry.avg_price.toLocaleString()}</Text>
                  <Text style={tdCellWide}>{entry.suppliers}</Text>
                </Section>
              ))}
            </Section>
          )}

          {entries.length === 0 && (
            <Section style={emptyBox}>
              <Text style={emptyText}>No new inventory recorded today.</Text>
            </Section>
          )}

          <Text style={signoff}>
            — {SITE_NAME} System
          </Text>
        </Section>

        <Hr style={divider} />
        <Text style={footer}>
          Automated daily inventory report • {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailyInventorySummaryEmail,
  subject: (data: Record<string, any>) =>
    `📦 Daily Inventory: ${data.totalKg?.toLocaleString() || 0} kg — ${data.reportDate || 'Today'}`,
  displayName: 'Daily Inventory Summary',
  previewData: {
    recipientName: 'Fauza',
    reportDate: 'Saturday, April 5, 2026',
    totalKg: 2491,
    totalBatches: 7,
    avgPricePerKg: 8500,
    entries: [
      { batch_number: 'B001-2026-04-05-Arabica', coffee_type: 'Arabica', kilograms: 784, avg_price: 8200, suppliers: 'Tigalyoma Monday, Hamuza' },
      { batch_number: 'B001-2026-04-05-Robusta', coffee_type: 'Robusta', kilograms: 632, avg_price: 9100, suppliers: 'Kambale, Chinani' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }
const header = {
  background: 'linear-gradient(135deg, #1a5c2e 0%, #2d8a4e 50%, #16a34a 100%)',
  padding: '35px 30px',
  textAlign: 'center' as const,
  borderRadius: '12px 12px 0 0',
}
const headerEmoji = { fontSize: '40px', margin: '0 0 8px', lineHeight: '1' }
const h1 = { fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: '0 0 6px', letterSpacing: '-0.5px' }
const subtitle = { fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: '0' }
const divider = { border: 'none', borderTop: '1px solid #e5e7eb', margin: '0' }
const content = { padding: '24px 30px 30px' }
const greeting = { fontSize: '15px', color: '#111827', margin: '0 0 8px', fontWeight: '600' as const }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 20px' }
const statsRow = { display: 'flex' as const, gap: '12px', margin: '0 0 24px' }
const statBox = {
  flex: '1',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '10px',
  padding: '16px',
  textAlign: 'center' as const,
}
const statValue = { fontSize: '20px', fontWeight: '800', color: '#166534', margin: '0 0 4px' }
const statLabel = { fontSize: '11px', color: '#15803d', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const tableSection = { margin: '0 0 20px' }
const tableTitle = { fontSize: '14px', fontWeight: '700', color: '#111827', margin: '0 0 10px' }
const tableHeader = {
  display: 'flex' as const,
  backgroundColor: '#1a5c2e',
  borderRadius: '6px 6px 0 0',
  padding: '8px 12px',
}
const thCell = { fontSize: '10px', fontWeight: '700', color: '#ffffff', flex: '1', margin: '0', textTransform: 'uppercase' as const }
const tableRowEven = { display: 'flex' as const, padding: '8px 12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }
const tableRowOdd = { display: 'flex' as const, padding: '8px 12px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' }
const tdCell = { fontSize: '12px', color: '#374151', flex: '1', margin: '0' }
const tdCellWide = { fontSize: '11px', color: '#6b7280', flex: '1.5', margin: '0' }
const emptyBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const emptyText = { fontSize: '13px', color: '#92400e', margin: '0' }
const signoff = { fontSize: '13px', color: '#6b7280', margin: '20px 0 0' }
const footer = { fontSize: '11px', color: '#9ca3af', textAlign: 'center' as const, padding: '16px 30px', margin: '0' }
