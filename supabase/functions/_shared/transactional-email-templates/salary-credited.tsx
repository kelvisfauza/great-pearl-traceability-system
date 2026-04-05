import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  month?: string
  grossSalary?: string
  advanceDeduction?: string
  netSalary?: string
  hasDeductions?: boolean
}

const SalaryCreditedEmail = ({
  employeeName, month = '', grossSalary = '0', advanceDeduction = '0',
  netSalary = '0', hasDeductions = false,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>💵 Salary Credited — UGX {netSalary} for {month}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>💵</Text>
          <Heading style={h1}>Salary Credited</Heading>
          <Text style={subtitle}>{SITE_NAME} — {month} Payroll</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>Dear {employeeName || 'Employee'},</Text>
          <Text style={bodyText}>
            Your salary for <strong>{month}</strong> has been processed and credited to your wallet.
          </Text>

          <Section style={summaryCard}>
            <Text style={cardTitle}>💰 SALARY BREAKDOWN</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Gross Salary:</td><td style={valueCell}>UGX {grossSalary}</td></tr>
              {hasDeductions && (
                <tr><td style={labelCell}>Advance Deduction:</td><td style={{...valueCell, color: '#c62828'}}>- UGX {advanceDeduction}</td></tr>
              )}
              <tr><td style={labelCell}><strong>Net Credited:</strong></td><td style={valueBold}>UGX {netSalary}</td></tr>
            </table>
          </Section>

          {hasDeductions && (
            <Section style={noteBox}>
              <Text style={noteText}>ℹ️ A salary advance deduction has been applied. This was previously approved and auto-recovered from your payroll.</Text>
            </Section>
          )}

          <Hr style={divider} />
          <Text style={closingText}>Log in to your dashboard to view your updated wallet balance and transaction history.</Text>
          <Text style={closing}>Best regards,<br /><strong>{SITE_NAME} Finance Department</strong></Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} • Monthly salary notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SalaryCreditedEmail,
  subject: (data: Record<string, any>) => `💵 Salary Credited — UGX ${data.netSalary || '0'} for ${data.month || 'this month'}`,
  displayName: 'Salary credited',
  previewData: {
    employeeName: 'Jane Doe', month: 'April 2026', grossSalary: '500,000',
    advanceDeduction: '50,000', netSalary: '450,000', hasDeductions: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const headerEmoji = { fontSize: '36px', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 20px' }
const summaryCard = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #c8e6c9' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 8px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#ddd', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '6px 8px 6px 0', width: '50%' }
const valueCell = { fontSize: '14px', color: '#333', padding: '6px 0', fontWeight: '500' as const }
const valueBold = { fontSize: '16px', color: '#1a5632', padding: '6px 0', fontWeight: 'bold' as const }
const noteBox = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', borderLeft: '4px solid #ff9800' }
const noteText = { fontSize: '12px', color: '#555', margin: '0', lineHeight: '1.5' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
