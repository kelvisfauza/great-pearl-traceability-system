import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Column, Row,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface PriceApprovalRequestProps {
  submittedBy?: string
  submittedByEmail?: string
  isCorrection?: boolean
  iceArabica?: string
  robusta?: string
  exchangeRate?: string
  drugarLocal?: string
  wugarLocal?: string
  robustaFaqLocal?: string
  arabicaOutturn?: string
  arabicaMoisture?: string
  arabicaFm?: string
  arabicaBuyingPrice?: string
  robustaOutturn?: string
  robustaMoisture?: string
  robustaFm?: string
  robustaBuyingPrice?: string
  sortedPrice?: string
  approveUrl?: string
  submittedAt?: string
}

const fmt = (v: string | number) => Number(v).toLocaleString()

const PriceApprovalRequestEmail = ({
  submittedBy = 'Data Analyst',
  submittedByEmail = '',
  isCorrection = false,
  iceArabica = '0',
  robusta = '0',
  exchangeRate = '0',
  drugarLocal = '0',
  wugarLocal = '0',
  robustaFaqLocal = '0',
  arabicaOutturn = '0',
  arabicaMoisture = '0',
  arabicaFm = '0',
  arabicaBuyingPrice = '0',
  robustaOutturn = '0',
  robustaMoisture = '0',
  robustaFm = '0',
  robustaBuyingPrice = '0',
  sortedPrice = '0',
  approveUrl = '#',
  submittedAt = new Date().toLocaleDateString(),
}: PriceApprovalRequestProps) => (
  <Html>
    <Head />
    <Preview>{isCorrection ? '⚠️ Price Correction' : '📊 New Price Update'} needs your approval - {SITE_NAME}</Preview>
    <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Arial, sans-serif', padding: '20px 0' }}>
      <Container style={{ backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '600px', margin: '0 auto', overflow: 'hidden' }}>
        
        {/* Header */}
        <Section style={{ backgroundColor: isCorrection ? '#dc2626' : '#1e40af', padding: '24px 32px', textAlign: 'center' as const }}>
          <Text style={{ color: '#ffffff', fontSize: '12px', letterSpacing: '2px', margin: '0 0 4px', textTransform: 'uppercase' as const }}>
            {isCorrection ? '⚠️ Price Correction Request' : '📊 Price Update Request'}
          </Text>
          <Heading style={{ color: '#ffffff', fontSize: '22px', margin: '0' }}>
            Pending Your Approval
          </Heading>
        </Section>

        <Section style={{ padding: '24px 32px' }}>
          <Text style={{ color: '#374151', fontSize: '15px', lineHeight: '1.6' }}>
            Hello,
          </Text>
          <Text style={{ color: '#374151', fontSize: '15px', lineHeight: '1.6' }}>
            <strong>{submittedBy}</strong> ({submittedByEmail}) has submitted a {isCorrection ? 'price correction' : 'new price update'} that requires your approval.
          </Text>

          {/* ICE Market Data */}
          <Text style={{ color: '#1e40af', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '20px 0 8px' }}>
            ICE Market Indicators
          </Text>
          <Section style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '16px', border: '1px solid #bfdbfe' }}>
            <Row>
              <Column style={{ width: '50%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0', textTransform: 'uppercase' as const }}>ICE Arabica (USD)</Text>
                <Text style={{ color: '#111827', fontSize: '18px', fontWeight: 'bold', margin: '2px 0 12px' }}>${fmt(iceArabica)}</Text>
              </Column>
              <Column style={{ width: '50%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0', textTransform: 'uppercase' as const }}>Robusta (USD)</Text>
                <Text style={{ color: '#111827', fontSize: '18px', fontWeight: 'bold', margin: '2px 0 12px' }}>${fmt(robusta)}</Text>
              </Column>
            </Row>
            <Row>
              <Column>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0', textTransform: 'uppercase' as const }}>Exchange Rate (UGX/USD)</Text>
                <Text style={{ color: '#111827', fontSize: '18px', fontWeight: 'bold', margin: '2px 0 0' }}>{fmt(exchangeRate)}</Text>
              </Column>
            </Row>
          </Section>

          {/* Local Prices */}
          <Text style={{ color: '#1e40af', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '20px 0 8px' }}>
            Local Prices (UGX/kg)
          </Text>
          <Section style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', border: '1px solid #bbf7d0' }}>
            <Row>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>Drugar</Text>
                <Text style={{ color: '#111827', fontSize: '16px', fontWeight: 'bold', margin: '2px 0 12px' }}>{fmt(drugarLocal)}</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>Wugar</Text>
                <Text style={{ color: '#111827', fontSize: '16px', fontWeight: 'bold', margin: '2px 0 12px' }}>{fmt(wugarLocal)}</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>Robusta FAQ</Text>
                <Text style={{ color: '#111827', fontSize: '16px', fontWeight: 'bold', margin: '2px 0 12px' }}>{fmt(robustaFaqLocal)}</Text>
              </Column>
            </Row>
          </Section>

          {/* Quality & Buying Prices */}
          <Text style={{ color: '#1e40af', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '20px 0 8px' }}>
            Arabica Buying
          </Text>
          <Section style={{ backgroundColor: '#fffbeb', borderRadius: '8px', padding: '16px', border: '1px solid #fde68a' }}>
            <Row>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>Outturn</Text>
                <Text style={{ color: '#111827', fontSize: '14px', fontWeight: 'bold', margin: '2px 0 8px' }}>{arabicaOutturn}%</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>Moisture</Text>
                <Text style={{ color: '#111827', fontSize: '14px', fontWeight: 'bold', margin: '2px 0 8px' }}>{arabicaMoisture}%</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>FM</Text>
                <Text style={{ color: '#111827', fontSize: '14px', fontWeight: 'bold', margin: '2px 0 8px' }}>{arabicaFm}%</Text>
              </Column>
            </Row>
            <Hr style={{ borderColor: '#fde68a', margin: '8px 0' }} />
            <Text style={{ color: '#92400e', fontSize: '11px', margin: '0', textTransform: 'uppercase' as const }}>Buying Price</Text>
            <Text style={{ color: '#92400e', fontSize: '22px', fontWeight: 'bold', margin: '2px 0 0' }}>UGX {fmt(arabicaBuyingPrice)}/kg</Text>
          </Section>

          <Text style={{ color: '#1e40af', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '20px 0 8px' }}>
            Robusta Buying
          </Text>
          <Section style={{ backgroundColor: '#fdf4ff', borderRadius: '8px', padding: '16px', border: '1px solid #e9d5ff' }}>
            <Row>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>Outturn</Text>
                <Text style={{ color: '#111827', fontSize: '14px', fontWeight: 'bold', margin: '2px 0 8px' }}>{robustaOutturn}%</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>Moisture</Text>
                <Text style={{ color: '#111827', fontSize: '14px', fontWeight: 'bold', margin: '2px 0 8px' }}>{robustaMoisture}%</Text>
              </Column>
              <Column style={{ width: '33%' }}>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>FM</Text>
                <Text style={{ color: '#111827', fontSize: '14px', fontWeight: 'bold', margin: '2px 0 8px' }}>{robustaFm}%</Text>
              </Column>
            </Row>
            <Hr style={{ borderColor: '#e9d5ff', margin: '8px 0' }} />
            <Text style={{ color: '#6b21a8', fontSize: '11px', margin: '0', textTransform: 'uppercase' as const }}>Buying Price</Text>
            <Text style={{ color: '#6b21a8', fontSize: '22px', fontWeight: 'bold', margin: '2px 0 0' }}>UGX {fmt(robustaBuyingPrice)}/kg</Text>
          </Section>

          {/* Sorted Price */}
          <Section style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px 16px', border: '1px solid #e5e7eb', marginTop: '12px' }}>
            <Row>
              <Column>
                <Text style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>Sorted Price</Text>
                <Text style={{ color: '#111827', fontSize: '18px', fontWeight: 'bold', margin: '2px 0 0' }}>UGX {fmt(sortedPrice)}/kg</Text>
              </Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: 'center' as const, marginTop: '24px' }}>
            <Button
              href={approveUrl}
              style={{
                backgroundColor: '#1e40af',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '14px 32px',
                textDecoration: 'none',
              }}
            >
              Review & Approve in System
            </Button>
          </Section>

          <Text style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' as const, marginTop: '16px' }}>
            Submitted on {submittedAt}
          </Text>
        </Section>

        {/* Footer */}
        <Section style={{ backgroundColor: '#f9fafb', padding: '16px 32px', borderTop: '1px solid #e5e7eb' }}>
          <Text style={{ color: '#9ca3af', fontSize: '11px', textAlign: 'center' as const, margin: '0' }}>
            {SITE_NAME} Management System • Price Approval Notification
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: PriceApprovalRequestEmail,
  subject: (data) => data.isCorrection ? '⚠️ Price Correction Awaiting Approval' : '📊 New Price Update Awaiting Your Approval',
  displayName: 'Price Approval Request',
}
