import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Great Pearl Coffee'

interface WithdrawalCodeProps {
  name?: string
  code?: string
  amount?: string
  method?: string
}

const WithdrawalVerificationEmail = ({ name, code = '12345', amount, method }: WithdrawalCodeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🔐 Your Withdrawal Verification Code — {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Withdrawal Verification</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>{name ? `Dear ${name},` : 'Dear Team Member,'}</Text>
          <Text style={bodyText}>
            You have initiated a withdrawal request. Use the code below to verify and proceed:
          </Text>
          {amount && (
            <Section style={detailBox}>
              <Text style={detailItem}><strong>Amount:</strong> UGX {amount}</Text>
              {method && <Text style={detailItem}><strong>Method:</strong> {method}</Text>}
            </Section>
          )}
          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={bodyText}>
            This code expires in <strong>5 minutes</strong>. Do NOT share this code with anyone.
          </Text>
          <Text style={warningText}>
            ⚠️ If you did not initiate this withdrawal, please contact administration immediately.
          </Text>
          <Hr style={divider} />
          <Text style={footer}>{SITE_NAME} — Kasese, Uganda</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WithdrawalVerificationEmail,
  subject: '🔐 Withdrawal Verification Code',
  displayName: 'Withdrawal verification code',
  previewData: { name: 'Jane', code: '54321', amount: '500,000', method: 'Mobile Money' },
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
const codeText = { fontFamily: 'Courier, monospace', fontSize: '36px', fontWeight: 'bold', color: '#1a5632', letterSpacing: '10px', margin: '0' }
const warningText = { fontSize: '13px', color: '#d32f2f', lineHeight: '1.5', margin: '0 0 18px' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
