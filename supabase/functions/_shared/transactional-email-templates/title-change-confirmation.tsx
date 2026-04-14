/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Agro Coffee'

interface TitleChangeProps {
  employeeName?: string
  previousPosition?: string
  newPosition?: string
  previousDepartment?: string
  newDepartment?: string
  effectiveDate?: string
}

const TitleChangeConfirmationEmail = ({
  employeeName = 'Team Member',
  previousPosition = 'Staff',
  newPosition = 'New Role',
  previousDepartment,
  newDepartment,
  effectiveDate,
}: TitleChangeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your role at {SITE_NAME} has been updated</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Role Update Confirmation</Heading>
        <Text style={text}>
          Dear {employeeName},
        </Text>
        <Text style={text}>
          This is to officially confirm that your role at {SITE_NAME} has been updated as follows:
        </Text>

        <Section style={detailsBox}>
          <Text style={detailLabel}>Previous Position:</Text>
          <Text style={detailValue}>{previousPosition}</Text>
          
          {previousDepartment && newDepartment && previousDepartment !== newDepartment ? (
            <>
              <Text style={detailLabel}>Previous Department:</Text>
              <Text style={detailValue}>{previousDepartment}</Text>
            </>
          ) : null}

          <Hr style={divider} />

          <Text style={detailLabel}>New Position:</Text>
          <Text style={detailValueHighlight}>{newPosition}</Text>

          {newDepartment ? (
            <>
              <Text style={detailLabel}>New Department:</Text>
              <Text style={detailValueHighlight}>{newDepartment}</Text>
            </>
          ) : null}

          {effectiveDate ? (
            <>
              <Text style={detailLabel}>Effective Date:</Text>
              <Text style={detailValue}>{effectiveDate}</Text>
            </>
          ) : null}
        </Section>

        <Text style={text}>
          This change has been recorded in the system. If you have any questions about your new role, 
          please contact your department head or the HR team.
        </Text>

        <Text style={text}>
          We wish you success in your new role!
        </Text>

        <Text style={footer}>
          {SITE_NAME} — Kasese, Uganda
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TitleChangeConfirmationEmail,
  subject: (data: Record<string, any>) => `Role Update: You are now ${data.newPosition || 'Updated'}`,
  displayName: 'Title change confirmation',
  previewData: {
    employeeName: 'John Doe',
    previousPosition: 'Office Attendant',
    newPosition: 'Trader',
    previousDepartment: 'Administration',
    newDepartment: 'Trade',
    effectiveDate: '14 April 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1a1a2e',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const detailsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 20px',
  border: '1px solid #e9ecef',
}
const detailLabel = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 2px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const detailValue = {
  fontSize: '15px',
  color: '#1a1a2e',
  margin: '0 0 12px',
  fontWeight: '500' as const,
}
const detailValueHighlight = {
  fontSize: '15px',
  color: '#2563eb',
  margin: '0 0 12px',
  fontWeight: 'bold' as const,
}
const divider = { borderColor: '#dee2e6', margin: '12px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
