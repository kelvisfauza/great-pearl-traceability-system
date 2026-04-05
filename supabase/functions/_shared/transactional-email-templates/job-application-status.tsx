import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Great Agro Coffee"
const LOGO_URL = "https://pudfybkyfedeggmokhco.supabase.co/storage/v1/object/public/system-assets/gac-logo.png"

interface JobApplicationStatusProps {
  applicantName?: string
  refCode?: string
  position?: string
  newStatus?: string
  notes?: string
  statusMessage?: string
}

const statusBannerColors: Record<string, { bg: string; text: string; border: string }> = {
  Pending: { bg: '#fef9c3', text: '#854d0e', border: '#facc15' },
  Reviewed: { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
  'Interview Scheduled': { bg: '#f3e8ff', text: '#6b21a8', border: '#a855f7' },
  Interviewed: { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
  Shortlisted: { bg: '#cffafe', text: '#155e75', border: '#22d3ee' },
  Accepted: { bg: '#dcfce7', text: '#166534', border: '#4ade80' },
  Rejected: { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
}

const JobApplicationStatusEmail = ({
  applicantName = 'Applicant',
  refCode = 'N/A',
  position = 'N/A',
  newStatus = 'Updated',
  notes,
  statusMessage,
}: JobApplicationStatusProps) => {
  const colors = statusBannerColors[newStatus] || { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' }

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Application ${refCode} – ${newStatus}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={LOGO_URL} width="60" height="60" alt={SITE_NAME} style={logo} />
            <Text style={brandName}>{SITE_NAME}</Text>
          </Section>

          <Heading style={h1}>Application Status Update</Heading>

          <Section style={{ ...statusBanner, backgroundColor: colors.bg, borderLeft: `4px solid ${colors.border}` }}>
            <Text style={{ ...statusText, color: colors.text }}>
              Status: <strong>{newStatus}</strong>
            </Text>
          </Section>

          <Text style={text}>Dear <strong>{applicantName}</strong>,</Text>

          <Text style={text}>
            {statusMessage || `Your job application (Ref: ${refCode}) for the position of ${position} has been updated to "${newStatus}".`}
          </Text>

          {notes && (
            <Section style={notesBox}>
              <Text style={notesLabel}>Details / Notes:</Text>
              <Text style={notesContent}>{notes}</Text>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={detailsSection}>
            <Text style={detailRow}><strong>Reference:</strong> {refCode}</Text>
            <Text style={detailRow}><strong>Position:</strong> {position}</Text>
            <Text style={detailRow}><strong>Status:</strong> {newStatus}</Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            If you have any questions, please contact us at operations@greatpearlcoffee.com
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: JobApplicationStatusEmail,
  subject: (data: Record<string, any>) =>
    `Application ${data.refCode || ''} – ${data.newStatus || 'Status Update'}`,
  displayName: 'Job Application Status',
  previewData: {
    applicantName: 'Jane Doe',
    refCode: 'GPCJA001',
    position: 'Store Manager',
    newStatus: 'Interview Scheduled',
    notes: 'Interview on Monday 10am at the main office.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { margin: '0 auto', borderRadius: '12px' }
const brandName = { fontSize: '18px', fontWeight: 'bold' as const, color: '#166534', margin: '8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 20px', textAlign: 'center' as const }
const statusBanner = { padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }
const statusText = { fontSize: '16px', margin: '0', fontWeight: '600' as const }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const notesBox = { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }
const notesLabel = { fontSize: '12px', fontWeight: 'bold' as const, color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase' as const }
const notesContent = { fontSize: '14px', color: '#374151', margin: '0', lineHeight: '1.5' }
const hr = { border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }
const detailsSection = { marginBottom: '8px' }
const detailRow = { fontSize: '13px', color: '#4b5563', margin: '4px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '4px 0', textAlign: 'center' as const }
