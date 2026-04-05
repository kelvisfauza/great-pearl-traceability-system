import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface SalaryAdvanceConfirmationProps {
  employeeName?: string
  amount?: number
  minimumPayment?: number
  approvedBy?: string
  department?: string
  position?: string
  reason?: string
  remainingBalance?: number
  isCopy?: boolean
  copyRecipient?: string
}

const SalaryAdvanceConfirmationEmail = ({
  employeeName = 'Employee',
  amount = 0,
  minimumPayment = 0,
  approvedBy = 'Finance',
  department = '',
  position = '',
  reason = '',
  remainingBalance,
  isCopy = false,
  copyRecipient = '',
}: SalaryAdvanceConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isCopy
        ? `Copy: Salary advance of UGX ${(amount || 0).toLocaleString()} approved for ${employeeName}`
        : `Your salary advance of UGX ${(amount || 0).toLocaleString()} has been approved`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandText}>☕ {SITE_NAME}</Text>
        </Section>

        {isCopy && (
          <Section style={copyBanner}>
            <Text style={copyBannerText}>📋 COPY — This is a copy for your records</Text>
          </Section>
        )}

        <Heading style={h1}>
          {isCopy ? 'Salary Advance Approved' : 'Salary Advance Confirmed'}
        </Heading>

        <Text style={text}>
          {isCopy
            ? `This confirms that a salary advance has been approved and disbursed for ${employeeName}.`
            : `Dear ${employeeName}, your salary advance has been approved and disbursed. Below are the details:`}
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Employee:</strong> {employeeName}</Text>
          {department && <Text style={detailRow}><strong>Department:</strong> {department}</Text>}
          {position && <Text style={detailRow}><strong>Position:</strong> {position}</Text>}
          <Hr style={divider} />
          <Text style={detailRow}><strong>Advance Amount:</strong> UGX {(amount || 0).toLocaleString()}</Text>
          <Text style={detailRow}><strong>Min. Monthly Recovery:</strong> UGX {(minimumPayment || 0).toLocaleString()}</Text>
          <Text style={detailRow}><strong>Disbursement Method:</strong> Cash</Text>
          <Text style={detailRow}><strong>Approved By:</strong> {approvedBy}</Text>
          {reason && <Text style={detailRow}><strong>Reason:</strong> {reason}</Text>}
        </Section>

        <Section style={noticeBox}>
          <Text style={noticeText}>
            ⚠️ <strong>Recovery Notice:</strong> A minimum of UGX {(minimumPayment || 0).toLocaleString()} will be automatically deducted from your future salary payments until the advance is fully recovered.
          </Text>
        </Section>

        {remainingBalance !== undefined && (
          <Section style={balanceBox}>
            <Text style={balanceLabel}>Wallet Balance After Transaction</Text>
            <Text style={balanceAmount}>UGX {(remainingBalance || 0).toLocaleString()}</Text>
          </Section>
        )}

        <Text style={footer}>
          This is an automated notification from {SITE_NAME}. For questions, contact Finance or reply to this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SalaryAdvanceConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data.isCopy
      ? `Copy: Salary Advance Approved - ${data.employeeName || 'Employee'} (UGX ${(data.amount || 0).toLocaleString()})`
      : `Salary Advance Approved - UGX ${(data.amount || 0).toLocaleString()}`,
  displayName: 'Salary advance confirmation',
  previewData: {
    employeeName: 'Bwambale Benson',
    amount: 120000,
    minimumPayment: 40000,
    approvedBy: 'Fauza Kusa',
    department: 'EUDR Documentation',
    position: 'Office Attendant',
    reason: 'Cash salary advance',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '10px 0 20px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const detailsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', border: '1px solid #e9ecef' }
const detailRow = { fontSize: '14px', color: '#333333', margin: '6px 0', lineHeight: '1.5' }
const divider = { borderColor: '#dee2e6', margin: '10px 0' }
const noticeBox = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '14px 18px', margin: '0 0 20px', border: '1px solid #ffe082' }
const noticeText = { fontSize: '13px', color: '#6d4c00', margin: '0', lineHeight: '1.5' }
const copyBanner = { backgroundColor: '#e3f2fd', borderRadius: '6px', padding: '8px 14px', margin: '0 0 16px', textAlign: 'center' as const }
const copyBannerText = { fontSize: '12px', color: '#1565c0', margin: '0', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.4' }
const balanceBox = { backgroundColor: '#1a5c1a', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px', textAlign: 'center' as const }
const balanceLabel = { fontSize: '12px', color: '#c8e6c9', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const balanceAmount = { fontSize: '28px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0' }
