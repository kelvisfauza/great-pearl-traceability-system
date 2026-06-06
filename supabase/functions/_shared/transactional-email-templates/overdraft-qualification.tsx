import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface Props {
  employeeName?: string
  approvedLimit?: string
  rawLimit?: number
  period?: string
  dashboardUrl?: string
}

const OverdraftQualificationEmail = ({
  employeeName,
  approvedLimit = '0',
  rawLimit = 0,
  period = '',
  dashboardUrl = 'https://great-pearl-traceability-system.lovable.app/overdraft',
}: Props) => {
  const qualifies = (rawLimit || 0) > 0

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {qualifies
          ? `You qualify for a wallet overdraft up to UGX ${approvedLimit}`
          : `Your wallet overdraft eligibility update for ${period}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>
              {qualifies ? 'You Qualify for a Wallet Overdraft' : 'Wallet Overdraft — Eligibility Update'}
            </Heading>
            <Text style={subtitle}>{SITE_NAME}{period ? ` • ${period}` : ''}</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Dear {employeeName || 'Team member'},</Text>

            {qualifies ? (
              <>
                <Text style={bodyText}>
                  Good news — based on your recent wallet activity and salary, you have been
                  pre-qualified for a <strong>wallet overdraft facility</strong>. This lets you
                  withdraw or send money even when your wallet balance temporarily runs short,
                  so you are never stuck waiting.
                </Text>

                <Section style={limitCard}>
                  <Text style={limitLabel}>Your Overdraft Limit</Text>
                  <Text style={limitValue}>UGX {approvedLimit}</Text>
                  <Text style={limitNote}>Valid for {period || 'this month'} • Recomputed monthly</Text>
                </Section>
              </>
            ) : (
              <Text style={bodyText}>
                Your overdraft facility is currently set to <strong>UGX 0</strong> for {period || 'this period'}.
                Limits are recomputed every month from your average wallet inflow and salary. Keep using your
                wallet actively and your limit will be re-evaluated automatically — no need to apply.
              </Text>
            )}

            <Hr style={divider} />

            <Heading as="h2" style={h2}>How it works</Heading>
            <Text style={bullet}>• It's <strong>opt-in</strong>. Nothing is activated until you turn it on.</Text>
            <Text style={bullet}>• When you accept an overdraft on a withdrawal or transfer, a one-time
              <strong> 0.5% interest fee</strong> is charged upfront on the overdraft portion.</Text>
            <Text style={bullet}>• The overdraft amount and its interest are <strong>automatically recovered</strong>
              from your next incoming credit (salary, allowance, sale, transfer in).</Text>
            <Text style={bullet}>• No daily compounding. No surprise charges. The 0.5% is the only fee.</Text>
            <Text style={bullet}>• If the outstanding balance remains unpaid for <strong>30 days</strong>,
              the overdraft is temporarily frozen until repayment.</Text>

            <Hr style={divider} />

            <Heading as="h2" style={h2}>How to opt in</Heading>
            <Text style={bullet}>1. Open your dashboard and go to the <strong>Overdraft</strong> page.</Text>
            <Text style={bullet}>2. Review your assigned limit and the terms.</Text>
            <Text style={bullet}>3. Tap <strong>Activate overdraft</strong> — it takes effect instantly.</Text>
            <Text style={bullet}>4. You can still choose, transaction by transaction, whether to actually use it.</Text>

            <Section style={ctaSection}>
              <Button href={dashboardUrl} style={ctaButton}>
                {qualifies ? 'Activate My Overdraft' : 'View Overdraft Page'}
              </Button>
            </Section>

            <Hr style={divider} />
            <Text style={fineprint}>
              Limits are system-assigned (capped at UGX 2,000,000) and may change each month based on
              your wallet activity and salary. Activating the facility is free; you only pay the 0.5%
              upfront fee on the portion of a transaction that actually uses overdraft funds.
            </Text>

            <Text style={closing}>
              Best regards,<br />
              <strong>{SITE_NAME} Finance</strong>
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>© 2026 {SITE_NAME} • Overdraft eligibility notice</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OverdraftQualificationEmail,
  subject: (data: Record<string, any>) =>
    (data.rawLimit || 0) > 0
      ? `You qualify for a wallet overdraft — UGX ${data.approvedLimit || '0'}`
      : `Wallet overdraft eligibility update — ${data.period || ''}`,
  displayName: 'Overdraft qualification',
  previewData: { employeeName: 'Jane Doe', approvedLimit: '450,000', rawLimit: 450000, period: '2026-06' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#1a5632', padding: '30px 25px', textAlign: 'center' as const, borderRadius: '8px 8px 0 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 6px' }
const h2 = { fontSize: '15px', fontWeight: 'bold', color: '#1a5632', margin: '18px 0 10px' }
const subtitle = { fontSize: '13px', color: '#a8d5ba', margin: '0' }
const content = { padding: '25px' }
const greeting = { fontSize: '15px', color: '#333', margin: '0 0 15px' }
const bodyText = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 16px' }
const bullet = { fontSize: '13.5px', color: '#444', lineHeight: '1.7', margin: '0 0 6px' }
const limitCard = { backgroundColor: '#1a5632', borderRadius: '8px', padding: '22px', textAlign: 'center' as const, margin: '6px 0 8px' }
const limitLabel = { fontSize: '12px', color: '#a8d5ba', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const limitValue = { fontSize: '30px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 4px' }
const limitNote = { fontSize: '12px', color: '#a8d5ba', margin: '0' }
const divider = { borderColor: '#e0e0e0', margin: '18px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '20px 0 10px' }
const ctaButton = { backgroundColor: '#1a5632', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }
const fineprint = { fontSize: '11.5px', color: '#888', lineHeight: '1.5', margin: '0 0 18px' }
const closing = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0' }
const footerSection = { backgroundColor: '#f5f5f5', padding: '12px 25px', textAlign: 'center' as const, borderRadius: '0 0 8px 8px' }
const footerText = { fontSize: '11px', color: '#999', margin: '0' }