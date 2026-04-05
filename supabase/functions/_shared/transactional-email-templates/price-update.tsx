/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Row, Column, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface PriceUpdateProps {
  date?: string
  arabicaBuyingPrice?: number
  robustaBuyingPrice?: number
  sortedPrice?: number
  arabicaOutturn?: number
  arabicaMoisture?: number
  arabicaFm?: number
  robustaOutturn?: number
  robustaMoisture?: number
  robustaFm?: number
  iceArabica?: number
  robustaInternational?: number
  exchangeRate?: number
  drugarLocal?: number
  wugarLocal?: number
  robustaFaqLocal?: number
  isCorrection?: boolean
  approvedBy?: string
}

const fmt = (v?: number) =>
  v != null
    ? new Intl.NumberFormat('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
    : '—'

const PriceUpdateEmail = (props: PriceUpdateProps) => {
  const {
    date = new Date().toLocaleDateString('en-GB'),
    arabicaBuyingPrice = 0,
    robustaBuyingPrice = 0,
    sortedPrice = 0,
    arabicaOutturn = 0,
    arabicaMoisture = 0,
    arabicaFm = 0,
    robustaOutturn = 0,
    robustaMoisture = 0,
    robustaFm = 0,
    iceArabica,
    robustaInternational,
    exchangeRate,
    drugarLocal,
    wugarLocal,
    robustaFaqLocal,
    isCorrection = false,
    approvedBy,
  } = props

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {isCorrection ? 'CORRECTION: ' : ''}{SITE_NAME} — Buying Prices for {date}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img src={LOGO_URL} alt={SITE_NAME} width="40" height="40" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
            <Text style={headerBrand}>{SITE_NAME}</Text>
            <Heading style={h1}>
              {isCorrection ? '⚠️ PRICE CORRECTION' : 'Daily Price Update'}
            </Heading>
            <Text style={dateText}>{date}</Text>
            {isCorrection && (
              <Text style={correctionNotice}>
                Please disregard previously communicated prices. The corrected prices are below.
              </Text>
            )}
          </Section>

          <Hr style={divider} />

          {/* Buying Prices — Main Section */}
          <Heading style={h2}>Buying Prices (UGX/kg)</Heading>

          {/* Arabica Card */}
          <Section style={priceCard}>
            <Text style={priceCardLabel}>☕ Arabica</Text>
            <Text style={priceCardValue}>UGX {fmt(arabicaBuyingPrice)}/kg</Text>
            <Section style={metricsRow}>
              <Text style={metricItem}>Outturn: {arabicaOutturn}%</Text>
              <Text style={metricItem}>Moisture: {arabicaMoisture}%</Text>
              <Text style={metricItem}>Foreign Matter: {arabicaFm}%</Text>
            </Section>
          </Section>

          {/* Robusta Card */}
          <Section style={{ ...priceCard, borderLeft: '4px solid #059669' }}>
            <Text style={{ ...priceCardLabel, color: '#059669' }}>☕ Robusta</Text>
            <Text style={{ ...priceCardValue, color: '#059669' }}>UGX {fmt(robustaBuyingPrice)}/kg</Text>
            <Section style={metricsRow}>
              <Text style={metricItem}>Outturn: {robustaOutturn}%</Text>
              <Text style={metricItem}>Moisture: {robustaMoisture}%</Text>
              <Text style={metricItem}>Foreign Matter: {robustaFm}%</Text>
            </Section>
          </Section>

          {/* Sorted Price */}
          {sortedPrice > 0 && (
            <Section style={{ ...priceCard, borderLeft: '4px solid #7c3aed' }}>
              <Text style={{ ...priceCardLabel, color: '#7c3aed' }}>☕ Sorted Coffee</Text>
              <Text style={{ ...priceCardValue, color: '#7c3aed' }}>UGX {fmt(sortedPrice)}/kg</Text>
            </Section>
          )}

          <Hr style={divider} />

          {/* International Market Indicators */}
          <Heading style={h2}>International Market Indicators</Heading>
          <Section style={marketTable}>
            {iceArabica != null && (
              <Text style={marketRow}>
                <span style={marketLabel}>ICE Arabica (NY):</span>{' '}
                <span style={marketValue}>${iceArabica.toFixed(2)} cents/lb</span>
              </Text>
            )}
            {robustaInternational != null && (
              <Text style={marketRow}>
                <span style={marketLabel}>ICE Robusta (London):</span>{' '}
                <span style={marketValue}>${fmt(robustaInternational)} USD/mt</span>
              </Text>
            )}
            {exchangeRate != null && (
              <Text style={marketRow}>
                <span style={marketLabel}>Exchange Rate (USD/UGX):</span>{' '}
                <span style={marketValue}>{fmt(exchangeRate)}</span>
              </Text>
            )}
          </Section>

          <Hr style={divider} />

          {/* Local Reference Prices */}
          <Heading style={h2}>Local Reference Prices (UGX/kg)</Heading>
          <Section style={marketTable}>
            {drugarLocal != null && (
              <Text style={marketRow}>
                <span style={marketLabel}>Drugar:</span>{' '}
                <span style={marketValue}>UGX {fmt(drugarLocal)}</span>
              </Text>
            )}
            {wugarLocal != null && (
              <Text style={marketRow}>
                <span style={marketLabel}>Wugar:</span>{' '}
                <span style={marketValue}>UGX {fmt(wugarLocal)}</span>
              </Text>
            )}
            {robustaFaqLocal != null && (
              <Text style={marketRow}>
                <span style={marketLabel}>Robusta FAQ:</span>{' '}
                <span style={marketValue}>UGX {fmt(robustaFaqLocal)}</span>
              </Text>
            )}
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={instruction}>
            Use these prices for all purchases today. Contact your supervisor if you have questions.
          </Text>

          {approvedBy && (
            <Text style={approvalNote}>
              Approved by: {approvedBy}
            </Text>
          )}

          <Text style={footer}>
            {SITE_NAME} — Kasese, Uganda
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PriceUpdateEmail,
  subject: (data: Record<string, any>) =>
    `${data.isCorrection ? 'CORRECTION: ' : ''}Great Agro Coffee Prices — ${data.date || new Date().toLocaleDateString('en-GB')}`,
  displayName: 'Daily price update',
  previewData: {
    date: '05/04/2026',
    arabicaBuyingPrice: 9200,
    robustaBuyingPrice: 7500,
    sortedPrice: 6000,
    arabicaOutturn: 78,
    arabicaMoisture: 12,
    arabicaFm: 1.5,
    robustaOutturn: 80,
    robustaMoisture: 13,
    robustaFm: 2,
    iceArabica: 185.50,
    robustaInternational: 2450,
    exchangeRate: 3750,
    drugarLocal: 8500,
    wugarLocal: 8200,
    robustaFaqLocal: 7800,
    isCorrection: false,
    approvedBy: 'Admin User',
  },
} satisfies TemplateEntry

// — Styles —
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '600px' }
const header = { textAlign: 'center' as const, marginBottom: '8px' }
const headerBrand = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#92400e',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1e293b',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}
const h2 = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#334155',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const dateText = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
const correctionNotice = {
  fontSize: '13px',
  color: '#dc2626',
  fontWeight: '600' as const,
  backgroundColor: '#fef2f2',
  padding: '8px 12px',
  borderRadius: '6px',
  margin: '8px 0 0',
  textAlign: 'center' as const,
}
const divider = { borderColor: '#e2e8f0', margin: '20px 0' }
const priceCard = {
  backgroundColor: '#fffbeb',
  borderLeft: '4px solid #d97706',
  borderRadius: '8px',
  padding: '14px 16px',
  marginBottom: '12px',
}
const priceCardLabel = {
  fontSize: '13px',
  fontWeight: '600' as const,
  color: '#d97706',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
}
const priceCardValue = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#92400e',
  margin: '0 0 8px',
}
const metricsRow = { margin: '0' }
const metricItem = {
  fontSize: '12px',
  color: '#64748b',
  margin: '0 0 2px',
  display: 'inline-block' as const,
  marginRight: '16px',
}
const marketTable = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '4px',
}
const marketRow = {
  fontSize: '14px',
  color: '#334155',
  margin: '0 0 6px',
  lineHeight: '1.6',
}
const marketLabel = { fontWeight: '500' as const, color: '#64748b' }
const marketValue = { fontWeight: '600' as const, color: '#1e293b' }
const instruction = {
  fontSize: '14px',
  color: '#334155',
  backgroundColor: '#f0fdf4',
  padding: '12px 16px',
  borderRadius: '8px',
  borderLeft: '4px solid #22c55e',
  margin: '0 0 12px',
}
const approvalNote = {
  fontSize: '12px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
  margin: '0 0 8px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '16px 0 0', textAlign: 'center' as const }
