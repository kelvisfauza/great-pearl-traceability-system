import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  rank?: string
  month?: string
  year?: string
  reason?: string
  bonusAmount?: string
  avatarUrl?: string
  department?: string
}

const EmployeeOfTheMonthEmail = ({
  employeeName = 'Team Member',
  rank = '1',
  month = 'March',
  year = '2026',
  reason = 'Outstanding performance',
  bonusAmount = '50,000',
  avatarUrl,
  department = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🏆 Congratulations! You are Employee of the Month — {month} {year}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={trophy}>🏆</Text>
          <Heading style={h1}>Employee of the Month</Heading>
          <Text style={subtitle}>{SITE_NAME} — {month} {year}</Text>
        </Section>

        <Hr style={divider} />

        {avatarUrl && (
          <Section style={avatarSection}>
            <Img
              src={avatarUrl}
              alt={employeeName}
              width="120"
              height="120"
              style={avatarStyle}
            />
          </Section>
        )}

        <Section style={content}>
          <Text style={greeting}>
            Dear <strong>{employeeName}</strong>,
          </Text>

          <Text style={text}>
            We are thrilled to announce that you have been recognized as the{' '}
            <strong>#{rank} Employee of the Month</strong> for {month} {year}! 🎉
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>🌟 Recognition Details</Text>
            <Text style={highlightText}>
              <strong>Rank:</strong> #{rank}{'\n'}
              <strong>Department:</strong> {department}{'\n'}
              <strong>Reason:</strong> {reason}
            </Text>
          </Section>

          <Section style={bonusBox}>
            <Text style={bonusTitle}>💰 Bonus Awarded</Text>
            <Text style={bonusAmount_}>UGX {bonusAmount}</Text>
            <Text style={bonusNote}>
              This bonus has been credited to your wallet. You'll see it on your next login.
            </Text>
          </Section>

          <Text style={text}>
            Your dedication, hard work, and commitment to excellence have not gone unnoticed. 
            You inspire your colleagues and set the standard for what it means to be a 
            Great Agro Coffee team member.
          </Text>

          <Text style={text}>
            Keep up the outstanding work! Your name and photo will be featured on the 
            company dashboard for all staff to see. 🎯
          </Text>

          <Text style={signoff}>
            With appreciation,{'\n'}
            <strong>Management Team</strong>{'\n'}
            {SITE_NAME}
          </Text>
        </Section>

        <Hr style={divider} />
        <Text style={footer}>
          © {year} {SITE_NAME}. All rights reserved.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmployeeOfTheMonthEmail,
  subject: (data: Record<string, any>) =>
    `🏆 Congratulations ${data.employeeName || 'Team Member'}! Employee of the Month — ${data.month || ''} ${data.year || ''}`,
  displayName: 'Employee of the Month',
  previewData: {
    employeeName: 'Bwambale Denis',
    rank: '1',
    month: 'March',
    year: '2026',
    reason: 'Highest task completion and overtime commitment',
    bonusAmount: '50,000',
    department: 'Administration',
    avatarUrl: 'https://pudfybkyfedeggmokhco.supabase.co/storage/v1/object/public/profile_pictures/placeholder.jpg',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '580px', margin: '0 auto' }
const header = {
  background: 'linear-gradient(135deg, #1a5c2e 0%, #2d8a4e 50%, #f59e0b 100%)',
  padding: '40px 30px',
  textAlign: 'center' as const,
  borderRadius: '12px 12px 0 0',
}
const trophy = { fontSize: '48px', margin: '0 0 10px', lineHeight: '1' }
const h1 = { fontSize: '26px', fontWeight: '800', color: '#ffffff', margin: '0 0 8px', letterSpacing: '-0.5px' }
const subtitle = { fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: '0' }
const divider = { border: 'none', borderTop: '1px solid #e5e7eb', margin: '0' }
const avatarSection = { textAlign: 'center' as const, padding: '30px 0 10px' }
const avatarStyle = {
  borderRadius: '50%',
  border: '4px solid #f59e0b',
  objectFit: 'cover' as const,
  margin: '0 auto',
  display: 'block' as const,
}
const content = { padding: '20px 30px 30px' }
const greeting = { fontSize: '16px', color: '#111827', margin: '0 0 16px', lineHeight: '1.6' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 16px' }
const highlightBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '10px',
  padding: '20px',
  margin: '20px 0',
}
const highlightTitle = { fontSize: '15px', fontWeight: '700', color: '#166534', margin: '0 0 10px' }
const highlightText = { fontSize: '14px', color: '#15803d', margin: '0', lineHeight: '1.8', whiteSpace: 'pre-line' as const }
const bonusBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '10px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center' as const,
}
const bonusTitle = { fontSize: '15px', fontWeight: '700', color: '#92400e', margin: '0 0 8px' }
const bonusAmount_ = { fontSize: '28px', fontWeight: '800', color: '#d97706', margin: '0 0 8px' }
const bonusNote = { fontSize: '12px', color: '#a16207', margin: '0' }
const signoff = { fontSize: '14px', color: '#6b7280', margin: '24px 0 0', lineHeight: '1.7', whiteSpace: 'pre-line' as const }
const footer = { fontSize: '11px', color: '#9ca3af', textAlign: 'center' as const, padding: '16px 30px', margin: '0' }
