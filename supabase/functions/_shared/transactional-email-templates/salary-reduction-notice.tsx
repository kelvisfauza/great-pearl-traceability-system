import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Great Agro Coffee"

interface SalaryReductionProps {
  employeeName?: string
  previousSalary?: string
  newSalary?: string
  effectiveDate?: string
  reasons?: string[]
  supervisorName?: string
  isSupervisorCopy?: boolean
}

const SalaryReductionEmail = ({
  employeeName = 'Employee',
  previousSalary = '200,000',
  newSalary = '150,000',
  effectiveDate = 'April 2026',
  reasons = [],
  supervisorName,
  isSupervisorCopy = false,
}: SalaryReductionProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isSupervisorCopy
        ? `Salary Adjustment Notice – ${employeeName}`
        : `Important: Salary Adjustment Notice – ${SITE_NAME}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerText}>☕ {SITE_NAME}</Text>
          <Text style={headerSubtext}>Human Resources Department</Text>
        </Section>

        <Hr style={divider} />

        {isSupervisorCopy ? (
          <>
            <Heading style={h1}>Supervisor Notification: Salary Adjustment</Heading>
            <Text style={text}>
              Dear {supervisorName || 'Supervisor'},
            </Text>
            <Text style={text}>
              This is to inform you that a salary adjustment has been applied to your team member, <strong>{employeeName}</strong>, effective <strong>{effectiveDate}</strong>.
            </Text>
          </>
        ) : (
          <>
            <Heading style={h1}>Salary Adjustment Notice</Heading>
            <Text style={text}>
              Dear {employeeName},
            </Text>
            <Text style={text}>
              Following a performance review, the management has decided to make an adjustment to your salary package, effective <strong>{effectiveDate}</strong>.
            </Text>
          </>
        )}

        {/* Salary Details */}
        <Section style={detailsBox}>
          <Text style={detailLabel}>Employee</Text>
          <Text style={detailValue}>{employeeName}</Text>

          <Text style={detailLabel}>Previous Salary</Text>
          <Text style={detailValue}>UGX {previousSalary}</Text>

          <Text style={detailLabel}>New Salary</Text>
          <Text style={detailValueHighlight}>UGX {newSalary}</Text>

          <Text style={detailLabel}>Effective From</Text>
          <Text style={detailValue}>{effectiveDate}</Text>
        </Section>

        {/* Reasons */}
        {reasons && reasons.length > 0 && (
          <Section style={reasonsSection}>
            <Text style={reasonsTitle}>
              {isSupervisorCopy ? 'Reasons for Adjustment:' : 'Reasons for This Adjustment:'}
            </Text>
            {reasons.map((reason, i) => (
              <Text key={i} style={reasonItem}>• {reason}</Text>
            ))}
          </Section>
        )}

        <Hr style={divider} />

        {isSupervisorCopy ? (
          <Text style={text}>
            Please schedule a meeting with {employeeName} to discuss performance improvement expectations. 
            Provide guidance and support to help them meet the required standards. 
            Monthly progress reports will be expected.
          </Text>
        ) : (
          <>
            <Text style={text}>
              We understand this is not easy news. The company values your contribution and we encourage you 
              to work closely with your supervisor to address the highlighted areas. Consistent improvement 
              will be reviewed in subsequent evaluations.
            </Text>
            <Text style={text}>
              If you have any questions or wish to discuss this further, please contact the HR department 
              or your supervisor.
            </Text>
          </>
        )}

        <Hr style={divider} />
        <Text style={footer}>
          This is an official communication from {SITE_NAME} Human Resources.
        </Text>
        <Text style={footer}>
          Confidential — For the intended recipient only.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SalaryReductionEmail,
  subject: (data: Record<string, any>) =>
    data.isSupervisorCopy
      ? `Team Alert: Salary Adjustment for ${data.employeeName || 'Employee'}`
      : 'Important: Salary Adjustment Notice',
  displayName: 'Salary reduction notice',
  previewData: {
    employeeName: 'John Doe',
    previousSalary: '200,000',
    newSalary: '150,000',
    effectiveDate: 'April 2026',
    reasons: ['Irregular attendance', 'Low performance scores'],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 30px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const headerText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c2e', margin: '0' }
const headerSubtext = { fontSize: '12px', color: '#666', margin: '4px 0 0', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#b91c1c', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#fef2f2', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const detailLabel = { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, margin: '10px 0 2px', letterSpacing: '0.5px' }
const detailValue = { fontSize: '15px', color: '#333', fontWeight: '600' as const, margin: '0 0 8px' }
const detailValueHighlight = { fontSize: '18px', color: '#b91c1c', fontWeight: 'bold' as const, margin: '0 0 8px' }
const reasonsSection = { margin: '16px 0' }
const reasonsTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#333', margin: '0 0 8px' }
const reasonItem = { fontSize: '14px', color: '#555', margin: '4px 0 4px 8px', lineHeight: '1.5' }
const footer = { fontSize: '11px', color: '#999', margin: '4px 0', textAlign: 'center' as const }
