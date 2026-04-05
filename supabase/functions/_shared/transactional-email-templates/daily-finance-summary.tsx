/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Row, Column, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Agro Coffee'

interface FinanceSummaryProps {
  recipientName?: string
  reportDate?: string
  // Revenue & Sales
  salesToday?: number
  salesRevenueToday?: number
  salesKgToday?: number
  // Payments
  paymentsMadeToday?: number
  paymentsAmountToday?: number
  pendingPayments?: number
  pendingPaymentsAmount?: number
  // Expenses
  expensesToday?: number
  expensesAmountToday?: number
  // Approvals
  pendingFinanceApprovals?: number
  approvedToday?: number
  rejectedToday?: number
  // Withdrawals & Advances
  withdrawalsToday?: number
  withdrawalsAmount?: number
  advancesToday?: number
  advancesAmount?: number
  // Supplier balances
  totalSupplierOwed?: number
  // Cash position
  cashInToday?: number
  cashOutToday?: number
  // Lists
  pendingApprovalsList?: Array<{ title: string; type: string; amount: number; by: string }>
  recentPayments?: Array<{ supplier: string; amount: number; method: string }>
}

const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
  <Column style={{ ...card, borderTop: `3px solid ${color}` }}>
    <Text style={cardVal}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
    <Text style={cardLbl}>{label}</Text>
    {sub && <Text style={cardSub}>{sub}</Text>}
  </Column>
)

const FinanceSummaryEmail = (props: FinanceSummaryProps) => {
  const {
    recipientName = 'Finance Team', reportDate = 'Today',
    salesToday = 0, salesRevenueToday = 0, salesKgToday = 0,
    paymentsMadeToday = 0, paymentsAmountToday = 0,
    pendingPayments = 0, pendingPaymentsAmount = 0,
    expensesToday = 0, expensesAmountToday = 0,
    pendingFinanceApprovals = 0, approvedToday = 0, rejectedToday = 0,
    withdrawalsToday = 0, withdrawalsAmount = 0,
    advancesToday = 0, advancesAmount = 0,
    totalSupplierOwed = 0,
    cashInToday = 0, cashOutToday = 0,
    pendingApprovalsList = [], recentPayments = [],
  } = props

  const netCashFlow = cashInToday - cashOutToday

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Finance Daily Report — {reportDate} | Revenue: UGX {salesRevenueToday.toLocaleString()} | {pendingFinanceApprovals} pending</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={{ fontSize: '28px', margin: '0 0 6px' }}>💰</Text>
            <Heading style={headerTitle}>{SITE_NAME}</Heading>
            <Text style={headerSubText}>Finance Department — Daily Report</Text>
          </Section>
          <Section style={dateBanner}>
            <Text style={dateTextStyle}>{reportDate}</Text>
          </Section>

          <Text style={greeting}>Hi {recipientName},</Text>
          <Text style={intro}>Here's your end-of-day financial overview.</Text>

          {/* Revenue & Sales */}
          <Section style={secHdr}><Text style={secTitle}>📈 Revenue & Sales</Text></Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Sales Today" value={salesToday} sub={`${salesKgToday.toLocaleString()} kg`} color="#28a745" />
              <StatCard label="Revenue" value={`UGX ${(salesRevenueToday / 1000000).toFixed(1)}M`} sub={salesRevenueToday.toLocaleString()} color="#1a5632" />
              <StatCard label="Cash In" value={`UGX ${(cashInToday / 1000000).toFixed(1)}M`} color="#17a2b8" />
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Payments & Expenses */}
          <Section style={secHdr}><Text style={secTitle}>💸 Payments & Expenses</Text></Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Payments Made" value={paymentsMadeToday} sub={`UGX ${paymentsAmountToday.toLocaleString()}`} color="#dc3545" />
              <StatCard label="Pending Payments" value={pendingPayments} sub={`UGX ${pendingPaymentsAmount.toLocaleString()}`} color="#ffc107" />
              <StatCard label="Expenses" value={expensesToday} sub={`UGX ${expensesAmountToday.toLocaleString()}`} color="#6c757d" />
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Approvals & Withdrawals */}
          <Section style={secHdr}><Text style={secTitle}>✅ Approvals & Disbursements</Text></Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Pending Approvals" value={pendingFinanceApprovals} color="#ffc107" />
              <StatCard label="Approved" value={approvedToday} color="#28a745" />
              <StatCard label="Withdrawals" value={withdrawalsToday} sub={`UGX ${withdrawalsAmount.toLocaleString()}`} color="#6f42c1" />
              <StatCard label="Advances" value={advancesToday} sub={`UGX ${advancesAmount.toLocaleString()}`} color="#fd7e14" />
            </Row>
          </Section>

          {pendingApprovalsList.length > 0 && (
            <Section style={{ margin: '0 25px 14px' }}>
              <Text style={miniTitle}>⏳ Pending Financial Approvals</Text>
              <Section style={tHead}>
                <Row>
                  <Column style={{ ...thCell, width: '35%' }}>Title</Column>
                  <Column style={{ ...thCell, width: '20%' }}>Type</Column>
                  <Column style={{ ...thCell, width: '22%' }}>Amount</Column>
                  <Column style={{ ...thCell, width: '23%' }}>Requested By</Column>
                </Row>
              </Section>
              {pendingApprovalsList.slice(0, 8).map((a, i) => (
                <Section key={i} style={i % 2 === 0 ? trEven : trOdd}>
                  <Row>
                    <Column style={{ ...tdCell, width: '35%' }}>{a.title}</Column>
                    <Column style={{ ...tdCell, width: '20%' }}>{a.type}</Column>
                    <Column style={{ ...tdCell, width: '22%' }}>UGX {a.amount.toLocaleString()}</Column>
                    <Column style={{ ...tdCell, width: '23%' }}>{a.by}</Column>
                  </Row>
                </Section>
              ))}
            </Section>
          )}

          <Hr style={divider} />

          {/* Net Position */}
          <Section style={secHdr}><Text style={secTitle}>📊 Day's Cash Flow</Text></Section>
          <Section style={cardsRow}>
            <Row>
              <StatCard label="Total In" value={`UGX ${cashInToday.toLocaleString()}`} color="#28a745" />
              <StatCard label="Total Out" value={`UGX ${cashOutToday.toLocaleString()}`} color="#dc3545" />
              <StatCard label="Net Flow" value={`UGX ${netCashFlow.toLocaleString()}`} color={netCashFlow >= 0 ? '#28a745' : '#dc3545'} />
            </Row>
          </Section>

          {totalSupplierOwed > 0 && (
            <Section style={alertBox}>
              <Text style={{ fontSize: '13px', color: '#856404', margin: '0' }}>
                ⚠️ <strong>Supplier Obligations:</strong> UGX {totalSupplierOwed.toLocaleString()} owed across pending supplier payments
              </Text>
            </Section>
          )}

          <Section style={footer}>
            <Text style={footerText}>Automated financial summary — {SITE_NAME}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: FinanceSummaryEmail,
  subject: (data: Record<string, any>) =>
    `💰 Finance Daily Report — ${data.reportDate || 'Today'} | ${data.pendingFinanceApprovals || 0} Pending Approvals`,
  displayName: 'Finance Daily Summary',
  previewData: {
    recipientName: 'Godwin',
    reportDate: 'Saturday, April 5, 2026',
    salesToday: 2, salesRevenueToday: 45000000, salesKgToday: 18000,
    paymentsMadeToday: 5, paymentsAmountToday: 12000000,
    pendingPayments: 8, pendingPaymentsAmount: 25000000,
    expensesToday: 3, expensesAmountToday: 1500000,
    pendingFinanceApprovals: 4, approvedToday: 6, rejectedToday: 1,
    withdrawalsToday: 3, withdrawalsAmount: 2500000,
    advancesToday: 1, advancesAmount: 500000,
    totalSupplierOwed: 25000000,
    cashInToday: 45000000, cashOutToday: 16000000,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '620px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '24px 25px 16px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerTitle = { fontSize: '20px', fontWeight: '700', color: '#fff', margin: '0 0 4px' }
const headerSubText = { fontSize: '11px', color: '#b8d4c5', margin: '0', letterSpacing: '1.5px', textTransform: 'uppercase' as const }
const dateBanner = { backgroundColor: '#f0f7f3', padding: '8px 25px', borderBottom: '2px solid #1a5632' }
const dateTextStyle = { fontSize: '13px', color: '#1a5632', margin: '0', fontWeight: '600', textAlign: 'center' as const }
const greeting = { fontSize: '15px', color: '#1a1a1a', margin: '18px 25px 6px', fontWeight: '600' }
const intro = { fontSize: '13px', color: '#666', margin: '0 25px 16px', lineHeight: '1.5' }
const secHdr = { padding: '0 25px', marginBottom: '8px' }
const secTitle = { fontSize: '14px', fontWeight: '700', color: '#1a1a1a', margin: '0' }
const cardsRow = { padding: '0 20px', marginBottom: '12px' }
const card = { backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '12px 6px', textAlign: 'center' as const, margin: '0 2px', width: '30%' }
const cardVal = { fontSize: '18px', fontWeight: '800', color: '#1a1a1a', margin: '0' }
const cardLbl = { fontSize: '9px', fontWeight: '600', color: '#666', margin: '3px 0 1px', textTransform: 'uppercase' as const }
const cardSub = { fontSize: '9px', color: '#999', margin: '0' }
const divider = { borderColor: '#e9ecef', margin: '12px 25px' }
const miniTitle = { fontSize: '12px', fontWeight: '700', color: '#555', margin: '0 0 6px', textTransform: 'uppercase' as const }
const tHead = { backgroundColor: '#1a5632', borderRadius: '4px 4px 0 0' }
const thCell = { fontSize: '10px', fontWeight: '700', color: '#fff', padding: '6px 4px', textTransform: 'uppercase' as const }
const trEven = { backgroundColor: '#f8f9fa' }
const trOdd = { backgroundColor: '#ffffff', borderBottom: '1px solid #eee' }
const tdCell = { fontSize: '11px', color: '#333', padding: '6px 4px' }
const alertBox = { backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '12px 16px', margin: '0 25px 16px' }
const footer = { padding: '16px 25px 24px', textAlign: 'center' as const, backgroundColor: '#f8f9fa', borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
