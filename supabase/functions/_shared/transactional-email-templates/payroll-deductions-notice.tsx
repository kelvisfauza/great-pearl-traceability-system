import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface Props {
  employeeName?: string
  month?: string
  grossSalary?: string
  nssfEmployee?: string
  nssfEmployer?: string
  paye?: string
  estimatedNet?: string
  hasAdvance?: boolean
  advanceBalance?: string
}

const PayrollDeductionsNotice = ({
  employeeName = 'Employee', month = '', grossSalary = '0',
  nssfEmployee = '0', nssfEmployer = '0', paye = '0', estimatedNet = '0',
  hasAdvance = false, advanceBalance = '0',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New payroll deductions policy — your {month} estimate</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>New Payroll Deductions Policy</Heading>
          <Text style={subtitle}>{SITE_NAME} — Effective {month}</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>Dear {employeeName.split(' ')[0]},</Text>
          <Text style={bodyText}>
            Effective immediately, all monthly salaries will be processed with statutory deductions
            in line with Uganda law: <strong>NSSF (5% employee + 10% employer)</strong> and
            <strong> URA PAYE</strong>. Below is your personal estimate for <strong>{month}</strong>.
          </Text>

          <Section style={card}>
            <Text style={cardTitle}>YOUR SALARY ESTIMATE</Text>
            <Hr style={cardDivider} />
            <table style={tbl}>
              <tr><td style={lbl}>Gross Salary</td><td style={val}>UGX {grossSalary}</td></tr>
              <tr><td style={lbl}>NSSF Employee (5%)</td><td style={valNeg}>- UGX {nssfEmployee}</td></tr>
              <tr><td style={lbl}>PAYE (URA Tax)</td><td style={valNeg}>- UGX {paye}</td></tr>
              <tr style={netRow}>
                <td style={netLbl}>ESTIMATED NET PAY</td>
                <td style={netVal}>UGX {estimatedNet}</td>
              </tr>
            </table>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>Employer NSSF Contribution (10%)</Text>
            <Text style={infoText}>
              UGX {nssfEmployer} is paid by the company on top of your salary — it is NOT deducted from you.
              Total NSSF credited to your NSSF account each month: <strong>UGX {String(Number(String(nssfEmployee).replace(/,/g,'')) + Number(String(nssfEmployer).replace(/,/g,''))).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</strong>.
            </Text>
          </Section>

          {hasAdvance && (
            <Section style={warnBox}>
              <Text style={warnTitle}>Active Salary Advance</Text>
              <Text style={warnText}>
                You currently have an outstanding salary advance balance of <strong>UGX {advanceBalance}</strong>.
                The agreed monthly minimum payment will be auto-recovered from your salary BEFORE it is credited
                to your wallet. The figure above is an estimate of statutory deductions only — your actual net
                will be lower by the advance recovery amount.
              </Text>
            </Section>
          )}

          <Section style={section}>
            <Text style={sectionTitle}>How Salary Advances Work Going Forward</Text>
            <Text style={bodyText}>
              Any approved salary advance is recovered automatically from your monthly salary based on the
              minimum payment agreed at approval. The recovery happens BEFORE the net is credited to your
              wallet, so what you see in your wallet on the 27th is already final.
            </Text>
          </Section>

          <Section style={reminderBox}>
            <Text style={reminderTitle}>Action Required</Text>
            <Text style={reminderText}>
              Submit your <strong>TIN number</strong> and <strong>NSSF account number</strong> to HR/Admin
              if you have not yet — these are required for your statutory remittance.
            </Text>
          </Section>

          <Hr style={divider} />
          <Text style={closing}>For any clarification, contact HR or Finance.</Text>
          <Text style={signoff}>Regards,<br /><strong>{SITE_NAME} HR &amp; Finance</strong></Text>
        </Section>

        <Section style={footerSection}>
          <Text style={footerText}>© 2026 {SITE_NAME} — Confidential payroll communication</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PayrollDeductionsNotice,
  subject: (d: Record<string, any>) => `New Payroll Deductions — Your ${d.month || 'monthly'} estimate: UGX ${d.estimatedNet || '0'}`,
  displayName: 'Payroll deductions policy notice',
  previewData: {
    employeeName: 'Jane Doe', month: 'May 2026',
    grossSalary: '350,000', nssfEmployee: '17,500', nssfEmployer: '35,000',
    paye: '9,750', estimatedNet: '322,750', hasAdvance: true, advanceBalance: '50,000',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '620px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '28px 30px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 6px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '28px 30px' }
const greeting = { fontSize: '15px', color: '#222', margin: '0 0 14px', fontWeight: 600 as const }
const bodyText = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#f0f7f3', border: '1px solid #c8e6c9', borderRadius: '8px', padding: '18px 20px', margin: '0 0 18px' }
const cardTitle = { fontSize: '12px', fontWeight: 'bold' as const, color: '#1a5632', margin: '0 0 6px', letterSpacing: '0.8px' }
const cardDivider = { borderColor: '#c8e6c9', margin: '6px 0 10px' }
const tbl = { width: '100%', borderCollapse: 'collapse' as const }
const lbl = { fontSize: '13px', color: '#555', padding: '8px 0' }
const val = { fontSize: '14px', color: '#222', padding: '8px 0', textAlign: 'right' as const, fontWeight: 600 as const }
const valNeg = { fontSize: '14px', color: '#c62828', padding: '8px 0', textAlign: 'right' as const, fontWeight: 600 as const }
const netRow = { borderTop: '2px solid #1a5632' }
const netLbl = { fontSize: '14px', color: '#1a5632', padding: '12px 0 4px', fontWeight: 'bold' as const }
const netVal = { fontSize: '18px', color: '#1a5632', padding: '12px 0 4px', textAlign: 'right' as const, fontWeight: 'bold' as const }
const infoBox = { backgroundColor: '#e8f5e9', borderLeft: '4px solid #1a5632', padding: '12px 16px', margin: '0 0 16px', borderRadius: '4px' }
const infoTitle = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1a5632', margin: '0 0 4px' }
const infoText = { fontSize: '13px', color: '#444', lineHeight: '1.5', margin: '0' }
const warnBox = { backgroundColor: '#fff8e1', borderLeft: '4px solid #ff9800', padding: '12px 16px', margin: '0 0 16px', borderRadius: '4px' }
const warnTitle = { fontSize: '13px', fontWeight: 'bold' as const, color: '#e65100', margin: '0 0 4px' }
const warnText = { fontSize: '13px', color: '#444', lineHeight: '1.5', margin: '0' }
const section = { margin: '0 0 16px' }
const sectionTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#1a5632', margin: '0 0 6px' }
const reminderBox = { backgroundColor: '#ffebee', borderLeft: '4px solid #c62828', padding: '12px 16px', margin: '0 0 16px', borderRadius: '4px' }
const reminderTitle = { fontSize: '13px', fontWeight: 'bold' as const, color: '#c62828', margin: '0 0 4px' }
const reminderText = { fontSize: '13px', color: '#444', lineHeight: '1.5', margin: '0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closing = { fontSize: '13px', color: '#555', margin: '0 0 12px' }
const signoff = { fontSize: '14px', color: '#222', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }