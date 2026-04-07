import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Great Pearl Coffee System"

interface SupplierUpdateNoticeProps {
  supplierName?: string
  supplierCode?: string
  phone?: string
  alternativePhone?: string
  email?: string
  origin?: string
  bankName?: string
  accountName?: string
  accountNumber?: string
  updatedBy?: string
  updatedAt?: string
}

const SupplierUpdateNoticeEmail = ({
  supplierName, supplierCode, phone, alternativePhone, email,
  origin, bankName, accountName, accountNumber, updatedBy, updatedAt
}: SupplierUpdateNoticeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your supplier profile has been updated - {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Great Pearl Coffee</Heading>
          <Text style={subtitle}>Supplier Profile Update</Text>
        </Section>
        <Hr style={divider} />
        <Text style={text}>
          Dear {supplierName || 'Supplier'},
        </Text>
        <Text style={text}>
          Your supplier profile (Code: <strong>{supplierCode || 'N/A'}</strong>) has been updated in our system. Below are your current details on file:
        </Text>

        <Section style={detailsBox}>
          <Heading as="h3" style={sectionTitle}>Contact Information</Heading>
          <Text style={detailRow}><strong>Name:</strong> {supplierName || 'N/A'}</Text>
          <Text style={detailRow}><strong>Phone:</strong> {phone || 'Not set'}</Text>
          <Text style={detailRow}><strong>Alt. Phone:</strong> {alternativePhone || 'Not set'}</Text>
          <Text style={detailRow}><strong>Email:</strong> {email || 'Not set'}</Text>
          <Text style={detailRow}><strong>Location:</strong> {origin || 'Not set'}</Text>
        </Section>

        <Section style={detailsBox}>
          <Heading as="h3" style={sectionTitle}>Bank Details</Heading>
          <Text style={detailRow}><strong>Bank:</strong> {bankName || 'Not set'}</Text>
          <Text style={detailRow}><strong>Account Name:</strong> {accountName || 'Not set'}</Text>
          <Text style={detailRow}><strong>Account Number:</strong> {accountNumber || 'Not set'}</Text>
        </Section>

        <Hr style={divider} />
        <Text style={footerText}>
          Updated by: {updatedBy || 'System'} on {updatedAt || new Date().toLocaleDateString()}
        </Text>
        <Text style={footerText}>
          If any of this information is incorrect, please contact procurement immediately.
        </Text>
        <Text style={footerText}>
          Best regards,<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SupplierUpdateNoticeEmail,
  subject: 'Your Supplier Profile Has Been Updated',
  displayName: 'Supplier profile update notice',
  previewData: {
    supplierName: 'John Mukasa',
    supplierCode: 'SUP-001',
    phone: '+256700123456',
    alternativePhone: '+256771654321',
    email: 'john@example.com',
    origin: 'Mbale',
    bankName: 'Stanbic Bank',
    accountName: 'John Mukasa',
    accountNumber: '9100012345678',
    updatedBy: 'Procurement',
    updatedAt: '07 Apr 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '10px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1a5d1a', margin: '0 0 4px' }
const subtitle = { fontSize: '14px', color: '#666', margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '16px 0' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 12px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '14px 18px', margin: '0 0 14px' }
const sectionTitle = { fontSize: '14px', fontWeight: 'bold', color: '#1a5d1a', margin: '0 0 8px' }
const detailRow = { fontSize: '13px', color: '#333', margin: '0 0 4px', lineHeight: '1.5' }
const footerText = { fontSize: '12px', color: '#999', margin: '0 0 8px' }
