import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface PasswordResetTempProps {
  name?: string
  tempPassword?: string
  email?: string
}

const PasswordResetTempEmail = ({ name, tempPassword = 'TempXXXXX', email }: PasswordResetTempProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your temporary password — change it on next login</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Password Reset</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>{name ? `Dear ${name},` : 'Hello,'}</Text>
          <Text style={bodyText}>
            We received a request to reset your password. Use the temporary password below to log in.
            You will be required to set a new password immediately after logging in.
          </Text>
          {email && (
            <Section style={detailBox}>
              <Text style={detailItem}><strong>Email:</strong> {email}</Text>
            </Section>
          )}
          <Section style={codeBox}>
            <Text style={codeLabel}>Temporary password</Text>
            <Text style={codeText}>{tempPassword}</Text>
          </Section>
          <Text style={bodyText}>
            For your security, this temporary password will only work once — you must change it on
            your next login. Please delete this email after you have changed your password.
          </Text>
          <Text style={warningText}>
            ⚠️ If you did not request a password reset, contact the IT department immediately at
            Fauzakusa@greatpearlcoffee.com — your account may be compromised.
          </Text>
          <Hr style={divider} />
          <Text style={footer}>{SITE_NAME} — Kasese, Uganda</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PasswordResetTempEmail,
  subject: 'Your temporary password — Great Agro Coffee',
  displayName: 'Password reset (temporary password)',
  previewData: { name: 'Jane', tempPassword: 'ResetA1B2C3', email: 'jane@greatpearlcoffee.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 18px' }
const detailBox = { backgroundColor: '#f0f7f3', borderRadius: '8px', padding: '12px 16px', margin: '0 0 18px', borderLeft: '4px solid #1a5632' }
const detailItem = { fontSize: '14px', color: '#333', margin: '0 0 4px' }
const codeBox = { backgroundColor: '#f4f4f4', borderRadius: '8px', padding: '18px', textAlign: 'center' as const, margin: '0 0 18px' }
const codeLabel = { fontSize: '12px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 6px' }
const codeText = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold', color: '#1a5632', letterSpacing: '4px', margin: '0' }
const warningText = { fontSize: '13px', color: '#d32f2f', lineHeight: '1.5', margin: '0 0 18px' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }