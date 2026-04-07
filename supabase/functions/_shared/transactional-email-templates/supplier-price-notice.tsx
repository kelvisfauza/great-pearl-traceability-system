/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface SupplierPriceNoticeProps {
  supplierName?: string
  date?: string
  arabicaBuyingPrice?: number
  robustaBuyingPrice?: number
  sortedPrice?: number
  isCorrection?: boolean
}

const SupplierPriceNoticeEmail = ({
  supplierName = 'Valued Supplier',
  date = new Date().toLocaleDateString('en-GB'),
  arabicaBuyingPrice = 0,
  robustaBuyingPrice = 0,
  sortedPrice = 0,
  isCorrection = false,
}: SupplierPriceNoticeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{isCorrection ? 'CORRECTION: ' : ''}Updated buying prices from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="160" height="50" alt={SITE_NAME} style={logo} />
        <Heading style={h1}>
          {isCorrection ? '⚠️ PRICE CORRECTION' : '📢 Buying Price Update'}
        </Heading>
        <Text style={text}>Dear <strong>{supplierName}</strong>,</Text>
        <Text style={text}>
          {isCorrection
            ? `Please disregard the previous prices. Below are the corrected buying prices effective ${date}:`
            : `We are writing to inform you of the updated buying prices effective ${date}:`}
        </Text>

        <Section style={priceTable}>
          {arabicaBuyingPrice > 0 && (
            <Section style={priceRow}>
              <Text style={priceLabel}>Arabica</Text>
              <Text style={priceValue}>UGX {arabicaBuyingPrice.toLocaleString()} /kg</Text>
            </Section>
          )}
          {robustaBuyingPrice > 0 && (
            <Section style={priceRow}>
              <Text style={priceLabel}>Robusta</Text>
              <Text style={priceValue}>UGX {robustaBuyingPrice.toLocaleString()} /kg</Text>
            </Section>
          )}
          {sortedPrice > 0 && (
            <Section style={priceRow}>
              <Text style={priceLabel}>Sorted</Text>
              <Text style={priceValue}>UGX {sortedPrice.toLocaleString()} /kg</Text>
            </Section>
          )}
        </Section>

        <Hr style={hr} />
        <Text style={text}>
          These prices are subject to quality assessment. Please ensure your deliveries meet
          our quality standards for moisture content and outturn.
        </Text>
        <Text style={text}>
          For any questions, contact our procurement team.
        </Text>
        <Text style={footer}>Best regards,<br />The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SupplierPriceNoticeEmail,
  subject: (data: Record<string, any>) =>
    `${data.isCorrection ? 'CORRECTION: ' : ''}${SITE_NAME} — Updated Buying Prices (${data.date || 'Today'})`,
  displayName: 'Supplier price notification',
  previewData: {
    supplierName: 'John Doe',
    date: '07/04/2026',
    arabicaBuyingPrice: 7500,
    robustaBuyingPrice: 5200,
    sortedPrice: 3000,
    isCorrection: false,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const logo = { margin: '0 0 20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const priceTable = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px', margin: '0 0 20px' }
const priceRow = { display: 'flex' as const, justifyContent: 'space-between' as const, padding: '8px 0', borderBottom: '1px solid #e9ecef' }
const priceLabel = { fontSize: '14px', fontWeight: 'bold' as const, color: '#333', margin: '0' }
const priceValue = { fontSize: '14px', fontWeight: 'bold' as const, color: '#16a34a', margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
