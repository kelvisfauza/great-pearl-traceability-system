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
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface VerificationCodeProps {
  code?: string
}

const VerificationCodeEmail = ({ code = '0000' }: VerificationCodeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for Great Agro Coffee</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Email Verification</Heading>
        <Text style={text}>
          Use the code below to verify your email and complete your sign-in to the Great Agro Coffee system:
        </Text>
        <Text style={codeStyle}>{code}</Text>
        <Text style={text}>
          This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
        </Text>
        <Text style={footer}>Great Agro Coffee — Kasese, Uganda</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VerificationCodeEmail,
  subject: 'Your Great Agro Coffee Verification Code',
  displayName: 'Email verification code',
  previewData: { code: '4829' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 13%, 18%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 9%, 46%)',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '36px',
  fontWeight: 'bold' as const,
  color: 'hsl(217, 91%, 60%)',
  letterSpacing: '10px',
  textAlign: 'center' as const,
  backgroundColor: '#f4f4f4',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 0 25px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
