/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface SupplierContractNoticeProps {
  supplierName?: string
  contractRef?: string
  coffeeType?: string
  quantityKg?: number
  pricePerKg?: number
  startDate?: string
  endDate?: string
  notes?: string
  actionType?: 'new' | 'updated' | 'cancelled'
}

const SupplierContractNoticeEmail = ({
  supplierName = 'Valued Supplier',
  contractRef = 'N/A',
  coffeeType = 'Coffee',
  quantityKg = 0,
  pricePerKg = 0,
  startDate = '',
  endDate = '',
  notes = '',
  actionType = 'new',
}: SupplierContractNoticeProps) => {
  const actionTitle = actionType === 'new' ? '📋 New Contract Created'
    : actionType === 'updated' ? '✏️ Contract Updated'
    : '❌ Contract Cancelled';

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{actionTitle} — Contract {contractRef} with {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} width="160" height="50" alt={SITE_NAME} style={logo} />
          <Heading style={h1}>{actionTitle}</Heading>
          <Text style={text}>Dear <strong>{supplierName}</strong>,</Text>
          <Text style={text}>
            {actionType === 'new' && `A new supply contract has been created for you with ${SITE_NAME}. Please review the details below:`}
            {actionType === 'updated' && `Your supply contract has been updated. Please review the updated details below:`}
            {actionType === 'cancelled' && `We regret to inform you that the following contract has been cancelled:`}
          </Text>

          <Section style={detailsBox}>
            <Text style={detailRow}><strong>Contract Ref:</strong> {contractRef}</Text>
            <Text style={detailRow}><strong>Coffee Type:</strong> {coffeeType}</Text>
            <Text style={detailRow}><strong>Quantity:</strong> {quantityKg.toLocaleString()} kg</Text>
            <Text style={detailRow}><strong>Price:</strong> UGX {pricePerKg.toLocaleString()} /kg</Text>
            <Text style={detailRow}><strong>Total Value:</strong> UGX {(quantityKg * pricePerKg).toLocaleString()}</Text>
            {startDate && <Text style={detailRow}><strong>Start:</strong> {startDate}</Text>}
            {endDate && <Text style={detailRow}><strong>End:</strong> {endDate}</Text>}
          </Section>

          {notes && (
            <>
              <Hr style={hr} />
              <Text style={text}><strong>Notes:</strong> {notes}</Text>
            </>
          )}

          <Hr style={hr} />
          <Text style={text}>
            {actionType !== 'cancelled'
              ? 'Please ensure timely delivery as per the contract terms. Contact our procurement team for any questions.'
              : 'If you have any questions about this cancellation, please contact our procurement team.'}
          </Text>
          <Text style={footer}>Best regards,<br />The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SupplierContractNoticeEmail,
  subject: (data: Record<string, any>) =>
    `${SITE_NAME} — ${data.actionType === 'new' ? 'New Contract' : data.actionType === 'updated' ? 'Contract Updated' : 'Contract Cancelled'} (${data.contractRef || 'N/A'})`,
  displayName: 'Supplier contract notification',
  previewData: {
    supplierName: 'John Doe',
    contractRef: 'SC-2026-001',
    coffeeType: 'Arabica',
    quantityKg: 5000,
    pricePerKg: 7500,
    startDate: '01/04/2026',
    endDate: '30/06/2026',
    actionType: 'new',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const logo = { margin: '0 0 20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', border: '1px solid #bbf7d0', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#333', margin: '4px 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
