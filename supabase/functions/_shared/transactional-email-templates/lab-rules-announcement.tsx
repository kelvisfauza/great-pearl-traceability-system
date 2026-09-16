import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

const PARENT = 'A member of YEDA COFFEE COMPANY LIMITED'
const ADDRESS = 'P.O Box 431420, Kasese, Uganda'
const OPS_PHONE = '+256 393 101 103'

const HERO_URL = 'https://great-pearl-traceability-system.lovable.app/__l5e/assets-v1/5bf61b13-1f1e-477b-9ff4-78016641c5cb/quality-lab-hero.jpg'
const CUPPING_URL = 'https://great-pearl-traceability-system.lovable.app/__l5e/assets-v1/0aa5603a-de91-4ebc-9708-bf302cdb2f09/quality-lab-cupping.jpg'

interface Rule { title: string; body: string }

const RULES_PART_ONE: Rule[] = [
  { title: 'Authorized access only', body: 'Only Quality staff and specifically authorized employees may enter the laboratory. Visitors must be accompanied by authorized staff.' },
  { title: 'No unauthorized samples', body: 'Every coffee sample entering the laboratory must have a valid sample or batch identification. Unlabelled samples must not be tested or mixed with official samples.' },
  { title: 'Samples must remain traceable', body: 'Samples must never be exchanged, substituted, removed, concealed, taken home, sold, or given to another person without written authorization.' },
  { title: 'Record results immediately', body: 'Moisture, foreign matter, defects, screen analysis, outturn, and other required quality results must be recorded against the correct batch or sample as soon as testing is completed. Results must not be backdated or deliberately altered.' },
  { title: 'No manipulation of results', body: 'Employees must not change a quality result to influence the buying price, acceptance or rejection, dispatch, sales, or to benefit a supplier, buyer, or employee.' },
  { title: 'Independent testing', body: 'Quality assessments must be based on the actual sample and approved company procedures, regardless of the supplier, buyer, price, or person requesting the test.' },
  { title: 'Equipment control', body: 'Moisture meters, scales, grinders, sample roasters, and other laboratory equipment must be checked before use and maintained or calibrated according to the required schedule. Faults must be reported immediately.' },
  { title: 'Cleanliness is mandatory', body: 'Work surfaces and equipment must be cleaned after testing. Samples and waste must be cleared appropriately to prevent contamination between batches.' },
  { title: 'No food, alcohol, or smoking/vaping', body: 'These are prohibited inside the laboratory. Drinks are permitted only in a designated area where they cannot contaminate samples or equipment. Official coffee cupping is exempt.' },
  { title: 'Protect company property', body: 'Laboratory equipment, laptops, sample trays, documents, and other company property must not leave the designated area without authorization.' },
]

const RULES_PART_TWO: Rule[] = [
  { title: 'Confidentiality', body: 'Supplier prices, quality results, buying decisions, customer specifications, and other company information must not be disclosed to unauthorized persons.' },
  { title: 'Dispatch control', body: 'Coffee intended for sale or dispatch must undergo the required quality checks. The responsible Quality Officer must ensure that the corresponding report is entered into the company system before or within the approved dispatch workflow.' },
  { title: 'Handover between shifts or personnel', body: 'Outstanding samples, pending tests, retained samples, and unresolved quality issues must be formally handed over.' },
  { title: 'PPE and identification', body: 'Staff must wear the required laboratory protective clothing and either the approved company uniform or company identification while on duty.' },
  { title: 'Phones and photography', body: 'Personal photography or video of samples, documents, screens, or laboratory operations is prohibited unless authorized for company purposes.' },
  { title: 'Retained samples', body: 'Official retained or reference samples must be stored securely, properly labelled, and disposed of only according to the company\'s retention procedure.' },
  { title: 'Report irregularities immediately', body: 'Suspected sample tampering, theft, falsification, equipment interference, or unexplained discrepancies must immediately be reported to management.' },
  { title: 'Accountability', body: 'The Quality Officer handling a sample is responsible for its custody, testing, and records until it is properly handed over, stored, or disposed of.' },
  { title: 'End-of-day procedure', body: 'Before leaving, staff must ensure that all completed results are entered into the system, samples are secured, equipment is switched off where appropriate, workstations are clean, and the laboratory is secured.' },
  { title: 'Disciplinary action', body: 'Theft, deliberate sample substitution, falsification of results, unauthorized removal of samples, deliberate destruction of records, or serious interference with laboratory operations may constitute gross misconduct and will be handled under YEDA Coffee Company Limited\'s disciplinary procedures.' },
]

const RuleRow = ({ number, rule }: { number: number; rule: Rule }) => (
  <tr>
    <td style={ruleNumCell}>{number}.</td>
    <td style={ruleCell}>
      <Text style={ruleTitle}>{rule.title}</Text>
      <Text style={ruleBody}>{rule.body}</Text>
    </td>
  </tr>
)

interface LabRulesProps {
  recipientName?: string
}

const LabRulesAnnouncementEmail = ({ recipientName = 'Team Member' }: LabRulesProps) => (
  <Html>
    <Head />
    <Preview>Our new Quality Laboratory is complete — please read the official laboratory rules</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
            <tr>
              <td style={{ verticalAlign: 'middle', width: '56px' }}>
                <Img src={LOGO_URL} alt={`${SITE_NAME} logo`} width="48" height="48" style={{ borderRadius: '8px' }} />
              </td>
              <td style={{ verticalAlign: 'middle', paddingLeft: '12px' }}>
                <Text style={brandName}>{SITE_NAME}</Text>
                <Text style={brandSub}>{PARENT}</Text>
              </td>
            </tr>
          </table>
        </Section>
        <div style={accentBar} />
        <Section style={card}>
          <Img src={HERO_URL} alt="Inside the new Great Agro Coffee quality laboratory" width="624" style={heroImg} />

          <Heading style={h1}>Our New Quality Laboratory Is Ready</Heading>
          <Text style={text}>Dear {recipientName},</Text>
          <Text style={text}>
            We are pleased to announce that the construction of our new Quality Laboratory is complete and the
            laboratory is now operational. This facility is at the heart of our promise of quality, traceability,
            and fair dealing with every supplier and buyer.
          </Text>
          <Text style={text}>
            To protect the integrity of every sample, every result, and everyone who works with the laboratory,
            the following <strong>Quality Laboratory Rules</strong> take effect immediately and apply to all staff.
            Please read them carefully.
          </Text>

          <Text style={sectionHeading}>Quality Laboratory Rules</Text>
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={rulesTable}>
            {RULES_PART_ONE.map((rule, i) => (
              <RuleRow key={i + 1} number={i + 1} rule={rule} />
            ))}
          </table>

          <Img src={CUPPING_URL} alt="Coffee cupping and grading in the laboratory" width="624" style={midImg} />

          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={rulesTable}>
            {RULES_PART_TWO.map((rule, i) => (
              <RuleRow key={i + 11} number={i + 11} rule={rule} />
            ))}
          </table>

          <Section style={noticeBox}>
            <Text style={noticeText}>
              These rules are effective immediately. If you have any question about any rule, or you suspect any
              irregularity, please report it to the Head of Quality or management right away. Thank you for
              upholding the standards that keep Great Agro Coffee trusted.
            </Text>
          </Section>

          <Text style={text}>Yours faithfully,<br />Management — {SITE_NAME}</Text>

          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} · {PARENT}</Text>
          <Text style={footerSmall}>{ADDRESS} · Operations Office: {OPS_PHONE}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LabRulesAnnouncementEmail,
  subject: 'New Quality Laboratory Completed — Official Laboratory Rules for All Staff',
  displayName: 'Lab Rules Announcement',
  previewData: { recipientName: 'Team Member' },
} satisfies TemplateEntry

const main = { backgroundColor: '#f4f6f4', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '16px', padding: '24px 0', WebkitTextSizeAdjust: '100%', msTextSizeAdjust: '100%' as any }
const container = { padding: '0', maxWidth: '680px', width: '100%', margin: '0 auto' }
const header = { backgroundColor: '#ffffff', padding: '20px 28px 12px', borderRadius: '10px 10px 0 0' }
const brandName = { fontSize: '18px', fontWeight: 700 as const, color: '#14532d', margin: '0', lineHeight: '1.2' }
const brandSub = { fontSize: '12px', color: '#6b7280', margin: '2px 0 0', lineHeight: '1.3' }
const accentBar = { height: '4px', backgroundColor: '#166534', lineHeight: '4px', fontSize: '1px' }
const card = { backgroundColor: '#ffffff', padding: '28px', borderRadius: '0 0 10px 10px' }
const heroImg = { width: '100%', maxWidth: '624px', borderRadius: '8px', margin: '0 0 20px', display: 'block' }
const midImg = { width: '100%', maxWidth: '624px', borderRadius: '8px', margin: '8px 0 20px', display: 'block' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '16px', color: '#1f2937', lineHeight: '1.7', margin: '0 0 14px', wordBreak: 'break-word' as const, overflowWrap: 'break-word' as const }
const sectionHeading = { fontSize: '18px', fontWeight: 700 as const, color: '#166534', margin: '8px 0 12px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }
const rulesTable = { borderCollapse: 'collapse' as const, margin: '0 0 8px' }
const ruleNumCell = { width: '32px', verticalAlign: 'top' as const, fontSize: '14px', fontWeight: 700 as const, color: '#166534', padding: '8px 4px 8px 0' }
const ruleCell = { verticalAlign: 'top' as const, padding: '6px 0 10px', borderBottom: '1px solid #f0f2f0' }
const ruleTitle = { fontSize: '15px', fontWeight: 700 as const, color: '#111827', margin: '0 0 2px', lineHeight: '1.4' }
const ruleBody = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0' }
const noticeBox = { backgroundColor: '#fef3c7', borderLeft: '4px solid #d97706', borderRadius: '6px', padding: '14px 16px', margin: '16px 0 20px' }
const noticeText = { fontSize: '14px', color: '#78350f', lineHeight: '1.6', margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { fontSize: '13px', color: '#4b5563', margin: '0', textAlign: 'center' as const }
const footerSmall = { fontSize: '12px', color: '#9ca3af', margin: '4px 0 0', textAlign: 'center' as const }
