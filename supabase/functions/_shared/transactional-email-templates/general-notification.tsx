import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Hr, Button, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

const PARENT = 'A member of YEDA COFFEE COMPANY LIMITED'
const ADDRESS = 'P.O Box 431420, Kasese, Uganda'
const OPS_PHONE = '+256 393 101 103'

interface GeneralNotificationProps {
  title?: string
  message?: string
  recipientName?: string
  ctaUrl?: string
  ctaLabel?: string
}

type Block =
  | { kind: 'text'; value: string }
  | { kind: 'bullet'; value: string }
  | { kind: 'table'; rows: string[][] }

const splitRow = (line: string) =>
  line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())

const isDivider = (cells: string[]) => cells.every((c) => /^:?-{2,}:?$/.test(c))

// Turn a plain-text message into blocks. A table is only recognised when at
// least TWO consecutive pipe-delimited lines share the same column count —
// a single line containing "|" (a URL, "Approved | Pending", prose) stays text.
const MIN_TABLE_ROWS = 2

const parseBlocks = (message: string): Block[] => {
  const lines = (message || '').split('\n')
  const blocks: Block[] = []
  let buffer: string[][] = []
  let rawBuffer: string[] = []

  const flush = () => {
    if (!buffer.length) return
    const cols = buffer[0].length
    const consistent = buffer.every((r) => r.length === cols)
    if (buffer.length >= MIN_TABLE_ROWS && consistent && cols > 1) {
      blocks.push({ kind: 'table', rows: buffer })
    } else {
      // Not a real table — keep the original lines as prose.
      for (const l of rawBuffer) if (l.trim()) blocks.push({ kind: 'text', value: l })
    }
    buffer = []
    rawBuffer = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.includes('|') && splitRow(line).length > 1) {
      const cells = splitRow(line)
      if (!isDivider(cells)) {
        buffer.push(cells)
        rawBuffer.push(line)
      }
      continue
    }
    flush()
    if (!line.trim()) continue
    if (/^\s*[•\-*]\s+/.test(line)) {
      blocks.push({ kind: 'bullet', value: line.replace(/^\s*[•\-*]\s+/, '') })
    } else {
      blocks.push({ kind: 'text', value: line })
    }
  }
  flush()
  return blocks
}

const DataTable = ({ rows }: { rows: string[][] }) => {
  const cols = Math.max(...rows.map((r) => r.length))
  const [header, ...body] = rows
  const pad = (r: string[]) => [...r, ...Array(Math.max(0, cols - r.length)).fill('')]
  return (
    <Section style={tableWrap}>
      <Row style={theadRow}>
        {pad(header).map((c, i) => (
          <Column key={i} style={th}>{c}</Column>
        ))}
      </Row>
      {body.map((r, ri) => (
        <Row key={ri} style={ri % 2 ? tdRowAlt : tdRow}>
          {pad(r).map((c, i) => (
            <Column key={i} style={td}>{c}</Column>
          ))}
        </Row>
      ))}
    </Section>
  )
}

const GeneralNotificationEmail = ({ title, message, recipientName, ctaUrl, ctaLabel }: GeneralNotificationProps) => {
  const blocks = parseBlocks(message || '')
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{title || 'System Notification'}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Brand header */}
          <Section style={header}>
            <Row>
              <Column style={{ width: '64px' }}>
                <Img src={LOGO_URL} width="52" height="52" alt={SITE_NAME} style={{ borderRadius: '8px' }} />
              </Column>
              <Column>
                <Text style={brandName}>{SITE_NAME}</Text>
                <Text style={brandSub}>{PARENT}</Text>
              </Column>
            </Row>
          </Section>
          <Section style={accentBar} />

          <Section style={card}>
            <Heading style={h1}>{title || 'System Notification'}</Heading>
            {recipientName && <Text style={text}>Dear {recipientName},</Text>}

            {blocks.map((b, i) => {
              if (b.kind === 'table') return <DataTable key={i} rows={b.rows} />
              if (b.kind === 'bullet') {
                return (
                  <Text key={i} style={bulletStyle}>
                    <span style={{ color: '#1a7f37', fontWeight: 700 }}>•</span> {b.value}
                  </Text>
                )
              }
              return <Text key={i} style={text}>{b.value}</Text>
            })}

            {ctaUrl && (
              <Section style={{ textAlign: 'center', margin: '32px 0 8px' }}>
                <Button href={ctaUrl} style={ctaButton}>{ctaLabel || 'Open'}</Button>
              </Section>
            )}
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            {SITE_NAME} — Automated System Notification
          </Text>
          <Text style={footerSmall}>
            {ADDRESS} · Operations Office: {OPS_PHONE}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: GeneralNotificationEmail,
  subject: (data: Record<string, any>) => data.subject || 'System Notification',
  displayName: 'General Notification',
  previewData: {
    title: 'Request for Original Prices of Rejected Lots',
    recipientName: 'Employee',
    message:
      'Please share the original prices for the rejected lots below.\n\nBatch | Supplier | Coffee Type | KG | Moisture | Status\n20260816001 | Dennis | Arabica | 293 | 16% | Rejected\n20260810017 | Jovita Masika | Arabica | 2,851 | 17% | Rejected\n\nKindly confirm each batch price.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#f4f6f4', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '16px', padding: '24px 0', WebkitTextSizeAdjust: '100%', msTextSizeAdjust: '100%' as any }
const container = { padding: '0', maxWidth: '680px', width: '100%', margin: '0 auto' }
const header = { backgroundColor: '#ffffff', padding: '20px 28px 12px', borderRadius: '10px 10px 0 0' }
const brandName = { fontSize: '18px', fontWeight: 700 as const, color: '#14532d', margin: '0', lineHeight: '1.2' }
const brandSub = { fontSize: '12px', color: '#6b7280', margin: '2px 0 0', lineHeight: '1.3' }
const accentBar = { height: '4px', backgroundColor: '#166534', lineHeight: '4px', fontSize: '1px' }
const card = { backgroundColor: '#ffffff', padding: '28px', borderRadius: '0 0 10px 10px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '16px', color: '#1f2937', lineHeight: '1.7', margin: '0 0 14px', wordBreak: 'break-word' as const, overflowWrap: 'break-word' as const }
const bulletStyle = { ...text, paddingLeft: '10px', margin: '0 0 8px' }
const tableWrap = { border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', margin: '8px 0 20px' }
const theadRow = { backgroundColor: '#166534' }
const th = { color: '#ffffff', fontSize: '13px', fontWeight: 700 as const, padding: '10px 12px', textAlign: 'left' as const, textTransform: 'uppercase' as const, letterSpacing: '0.3px' }
const tdRow = { backgroundColor: '#ffffff' }
const tdRowAlt = { backgroundColor: '#f9fafb' }
const td = { fontSize: '14px', color: '#1f2937', padding: '10px 12px', borderTop: '1px solid #e5e7eb', verticalAlign: 'top' as const }
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { fontSize: '13px', color: '#4b5563', margin: '0', textAlign: 'center' as const }
const footerSmall = { fontSize: '12px', color: '#9ca3af', margin: '4px 0 0', textAlign: 'center' as const }
