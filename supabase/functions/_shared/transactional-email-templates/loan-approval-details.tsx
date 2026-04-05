import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface LoanApprovalProps {
  employeeName?: string
  loanAmount?: string
  interestRate?: string
  dailyRate?: string
  durationMonths?: string
  totalRepayable?: string
  installmentAmount?: string
  installmentFrequency?: string
  numInstallments?: string
  firstDeductionDate?: string
  guarantorName?: string
  loanType?: string
  approvedBy?: string
  approvalDate?: string
  disbursedAmount?: string
  isTopUp?: boolean
  pdfDownloadUrl?: string
  isGuarantorCopy?: boolean
}

const LoanApprovalEmail = ({
  employeeName, loanAmount = '0', interestRate = '10', dailyRate = '0.33',
  durationMonths = '1', totalRepayable = '0', installmentAmount = '0',
  installmentFrequency = 'month', numInstallments = '1', firstDeductionDate = '',
  guarantorName = '', loanType = 'Quick Loan', approvedBy = '', approvalDate = '',
  disbursedAmount, isTopUp = false, pdfDownloadUrl, isGuarantorCopy = false,
}: LoanApprovalProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>✅ Loan {isTopUp ? 'Top-Up ' : ''}Approved — UGX {loanAmount} disbursed to your wallet</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerEmoji}>✅</Text>
          <Heading style={h1}>Loan {isTopUp ? 'Top-Up ' : ''}Approved</Heading>
          <Text style={subtitle}>{SITE_NAME} — Loan Agreement</Text>
        </Section>
        <Section style={content}>
          {isGuarantorCopy && (
            <Section style={guarantorNotice}>
              <Text style={guarantorNoticeText}>📋 GUARANTOR COPY — You are receiving this as the guarantor for this loan.</Text>
            </Section>
          )}
          <Text style={greeting}>{employeeName ? `Dear ${isGuarantorCopy ? guarantorName || 'Guarantor' : employeeName},` : 'Dear Employee,'}</Text>
          <Text style={bodyText}>
            {isGuarantorCopy
              ? `This is to confirm that ${employeeName}'s ${loanType.toLowerCase()} ${isTopUp ? 'top-up ' : ''}has been approved and disbursed. As the guarantor, please review the loan details below:`
              : `Your ${loanType.toLowerCase()} ${isTopUp ? 'top-up ' : ''}has been approved and disbursed to your wallet. Below are the full details of your loan agreement:`
            }
          </Text>

          {/* Loan Summary Card */}
          <Section style={summaryCard}>
            <Text style={cardTitle}>📋 LOAN SUMMARY</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Loan Type:</td><td style={valueCell}>{loanType}</td></tr>
              <tr><td style={labelCell}>Principal Amount:</td><td style={valueCell}>UGX {loanAmount}</td></tr>
              {isTopUp && disbursedAmount && (
                <tr><td style={labelCell}>Additional Disbursed:</td><td style={valueCell}>UGX {disbursedAmount}</td></tr>
              )}
              <tr><td style={labelCell}>Interest Rate:</td><td style={valueCell}>{interestRate}% /month ({dailyRate}% /day)</td></tr>
              <tr><td style={labelCell}>Duration:</td><td style={valueCell}>{durationMonths} month(s)</td></tr>
              <tr><td style={labelCell}>Total Repayable:</td><td style={valueCellBold}>UGX {totalRepayable}</td></tr>
            </table>
          </Section>

          {/* Repayment Schedule */}
          <Section style={repaymentCard}>
            <Text style={cardTitle}>📅 REPAYMENT SCHEDULE</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Installment:</td><td style={valueCell}>UGX {installmentAmount} / {installmentFrequency}</td></tr>
              <tr><td style={labelCell}>Number of Payments:</td><td style={valueCell}>{numInstallments} {installmentFrequency}(s)</td></tr>
              <tr><td style={labelCell}>First Deduction:</td><td style={valueCellBold}>{firstDeductionDate}</td></tr>
              <tr><td style={labelCell}>Recovery Method:</td><td style={valueCell}>Automatic wallet deduction</td></tr>
            </table>
          </Section>

          {/* Parties */}
          <Section style={partiesCard}>
            <Text style={cardTitle}>👥 PARTIES</Text>
            <Hr style={cardDivider} />
            <table style={detailTable}>
              <tr><td style={labelCell}>Borrower:</td><td style={valueCell}>{employeeName || 'N/A'}</td></tr>
              <tr><td style={labelCell}>Guarantor:</td><td style={valueCell}>{guarantorName || 'N/A'}</td></tr>
              <tr><td style={labelCell}>Approved By:</td><td style={valueCell}>{approvedBy || 'Administration'}</td></tr>
              <tr><td style={labelCell}>Approval Date:</td><td style={valueCell}>{approvalDate || new Date().toLocaleDateString('en-UG')}</td></tr>
            </table>
          </Section>

          {/* Terms */}
          <Section style={termsBox}>
            <Text style={termsTitle}>📌 Important Terms:</Text>
            <Text style={termsItem}>• Repayments are automatically deducted from your wallet on schedule.</Text>
            <Text style={termsItem}>• Failure to maintain sufficient wallet balance may result in recovery from your guarantor's wallet.</Text>
            <Text style={termsItem}>• Early repayment is allowed and attracts a pro-rata interest discount.</Text>
            <Text style={termsItem}>• Default on 3+ consecutive installments may trigger guarantor liability and salary deduction.</Text>
            <Text style={termsItem}>• This loan agreement is binding upon approval.</Text>
          </Section>

          {pdfDownloadUrl && (
            <Section style={pdfSection}>
              <Text style={pdfText}>📄 Download your official Loan Agreement PDF:</Text>
              <Button style={pdfButton} href={pdfDownloadUrl}>
                Download Loan Agreement PDF
              </Button>
            </Section>
          )}

          <Hr style={divider} />
          <Text style={closingText}>
            Please keep this email and the attached PDF for your records as your loan agreement document.
            If you have any questions, contact the Finance or Administration department.
          </Text>
          <Text style={closing}>
            Best regards,<br />
            <strong>{SITE_NAME} Finance Department</strong>
          </Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerText}>
            © 2026 {SITE_NAME} • This is an official loan agreement document • Ref: Generated at approval
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanApprovalEmail,
  subject: (data: Record<string, any>) =>
    data.isGuarantorCopy
      ? `📋 Guarantor Copy — Loan ${data.isTopUp ? 'Top-Up ' : ''}Approved for ${data.employeeName || 'Employee'}`
      : `✅ Loan ${data.isTopUp ? 'Top-Up ' : ''}Approved — UGX ${data.loanAmount || '0'}`,
  displayName: 'Loan approval details',
  previewData: {
    employeeName: 'Jane Doe', loanAmount: '500,000', interestRate: '10', dailyRate: '0.33',
    durationMonths: '3', totalRepayable: '650,000', installmentAmount: '54,167',
    installmentFrequency: 'month', numInstallments: '12', firstDeductionDate: '1 May 2026',
    guarantorName: 'John Smith', loanType: 'Quick Loan', approvedBy: 'Admin User',
    approvalDate: '5 Apr 2026', pdfDownloadUrl: 'https://example.com/loan.pdf',
  },
} satisfies TemplateEntry

// Styles
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
const repaymentCard = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #ffe082' }
const partiesCard = { backgroundColor: '#e3f2fd', borderRadius: '8px', padding: '16px', margin: '0 0 16px', border: '1px solid #90caf9' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold', color: '#1a5632', margin: '0 0 8px', letterSpacing: '0.5px' }
const cardDivider = { borderColor: '#ddd', margin: '8px 0 12px' }
const detailTable = { width: '100%', borderCollapse: 'collapse' as const }
const labelCell = { fontSize: '13px', color: '#777', padding: '4px 8px 4px 0', width: '45%', verticalAlign: 'top' as const }
const valueCell = { fontSize: '13px', color: '#333', padding: '4px 0', fontWeight: '500' as const }
const valueCellBold = { fontSize: '14px', color: '#1a5632', padding: '4px 0', fontWeight: 'bold' as const }
const termsBox = { backgroundColor: '#fafafa', borderRadius: '8px', padding: '16px', margin: '0 0 16px', borderLeft: '4px solid #ff9800' }
const termsTitle = { fontSize: '14px', fontWeight: 'bold', color: '#333', margin: '0 0 10px' }
const termsItem = { fontSize: '12px', color: '#555', lineHeight: '1.6', margin: '0 0 4px' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closingText = { fontSize: '13px', color: '#555', lineHeight: '1.5', margin: '0 0 15px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }
const guarantorNotice = { backgroundColor: '#e3f2fd', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', border: '1px solid #90caf9' }
const guarantorNoticeText = { fontSize: '13px', fontWeight: 'bold', color: '#1565c0', margin: '0' }
const pdfSection = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '16px', margin: '16px 0', textAlign: 'center' as const, border: '1px solid #c8e6c9' }
const pdfText = { fontSize: '14px', fontWeight: 'bold', color: '#333', margin: '0 0 12px' }
const pdfButton = { backgroundColor: '#1a5632', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }
