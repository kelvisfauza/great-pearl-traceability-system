import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME } from './brand.ts'

interface Props {
  employeeName?: string
  amount?: string
  reference?: string
}

const BirthdayWishEmail = ({ employeeName = 'Team Member', amount = '50,000', reference = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Happy Birthday {employeeName} - a gift of UGX {amount} is in your wallet</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Happy Birthday, {employeeName}!</Heading>
          <Text style={subtitle}>{SITE_NAME}</Text>
        </Section>
        <Section style={content}>
          <Text style={bodyText}>
            On behalf of the whole {SITE_NAME} family, we wish you a wonderful birthday filled with joy,
            good health and success. Thank you for everything you bring to the team.
          </Text>
          <Section style={card}>
            <Text style={label}>Birthday Gift Credited</Text>
            <Text style={value}>UGX {amount}</Text>
            {reference ? <Text style={refText}>Ref: {reference}</Text> : null}
          </Section>
          <Hr style={divider} />
          <Text style={closing}>Warm regards,<br /><strong>{SITE_NAME} Management</strong></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BirthdayWishEmail,
  subject: (data: Record<string, any>) => `Happy Birthday ${data.employeeName || ''} - from ${SITE_NAME}`,
  displayName: 'Birthday wish',
  previewData: { employeeName: 'Jane', amount: '50,000', reference: 'BD-2026-JANE' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#b45309', padding: '28px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 5px' }
const subtitle = { fontSize: '13px', color: '#fde68a', margin: '0' }
const content = { padding: '25px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 20px' }
const card = { backgroundColor: '#fef3c7', borderRadius: '8px', padding: '20px', textAlign: 'center' as const }
const label = { fontSize: '12px', color: '#92400e', margin: '0 0 6px', textTransform: 'uppercase' as const }
const value = { fontSize: '30px', fontWeight: 'bold', color: '#92400e', margin: '0' }
const refText = { fontSize: '12px', color: '#92400e', margin: '6px 0 0' }
const divider = { borderColor: '#e0e0e0', margin: '20px 0' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
