import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL } from './brand.ts'

interface OvertimeRewardProps {
  employeeName?: string
  department?: string
  position?: string
  month?: string
  totalOvertimeMinutes?: number
  totalLateMinutes?: number
  netOvertimeMinutes?: number
  netOvertimeHours?: number
  ratePerHour?: number
  rewardAmount?: number
}

const OvertimeRewardEmail = ({
  employeeName = 'Employee',
  department = '',
  position = '',
  month = 'March 2026',
  totalOvertimeMinutes = 0,
  totalLateMinutes = 0,
  netOvertimeMinutes = 0,
  netOvertimeHours = 0,
  ratePerHour = 3000,
  rewardAmount = 0,
}: OvertimeRewardProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      🎉 You earned UGX {(rewardAmount || 0).toLocaleString()} in overtime rewards for {month}!
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandText}>☕ {SITE_NAME}</Text>
        </Section>

        <Section style={heroBanner}>
          <Text style={heroEmoji}>⏰</Text>
          <Text style={heroTitle}>Overtime Reward</Text>
          <Text style={heroSubtitle}>{month}</Text>
        </Section>

        <Heading style={h1}>Well Done, {employeeName}! 🎉</Heading>

        <Text style={text}>
          We appreciate your extra effort and dedication. After reviewing the attendance records for <strong>{month}</strong>, 
          you have earned an overtime reward. Here is a detailed breakdown of how your reward was calculated:
        </Text>

        <Section style={breakdownBox}>
          <Text style={breakdownTitle}>📊 Your Attendance Breakdown</Text>
          <Hr style={divider} />
          
          <Section style={rowStyle}>
            <Text style={labelStyle}>Total Overtime Recorded</Text>
            <Text style={valueStyle}>{(totalOvertimeMinutes || 0).toLocaleString()} minutes ({Math.floor((totalOvertimeMinutes || 0) / 60)}h {(totalOvertimeMinutes || 0) % 60}m)</Text>
          </Section>

          <Section style={rowStyle}>
            <Text style={labelStyle}>Total Late Time Recorded</Text>
            <Text style={valueStyleRed}>- {(totalLateMinutes || 0).toLocaleString()} minutes ({Math.floor((totalLateMinutes || 0) / 60)}h {(totalLateMinutes || 0) % 60}m)</Text>
          </Section>

          <Hr style={divider} />

          <Section style={rowStyle}>
            <Text style={labelStyleBold}>Net Overtime (After Deductions)</Text>
            <Text style={valueStyleGreen}>{(netOvertimeMinutes || 0).toLocaleString()} minutes = {netOvertimeHours} hours</Text>
          </Section>
        </Section>

        <Section style={calculationBox}>
          <Text style={calcTitle}>💰 Reward Calculation</Text>
          <Hr style={dividerLight} />
          <Text style={calcRow}>{netOvertimeHours} hours × UGX {(ratePerHour || 0).toLocaleString()}/hr</Text>
          <Text style={rewardAmountStyle}>= UGX {(rewardAmount || 0).toLocaleString()}</Text>
        </Section>

        <Section style={rewardBadge}>
          <Text style={rewardBadgeLabel}>YOUR OVERTIME REWARD</Text>
          <Text style={rewardBadgeAmount}>UGX {(rewardAmount || 0).toLocaleString()}</Text>
        </Section>

        <Section style={infoBox}>
          <Text style={infoText}>
            ℹ️ <strong>How to claim:</strong> This reward has been added to your <strong>Bonuses</strong>. 
            Log in to the system and go to your <strong>Wallet → Bonuses</strong> section to claim it. 
            Once claimed, the amount will be credited to your wallet balance.
          </Text>
        </Section>

        <Section style={noteBox}>
          <Text style={noteText}>
            📝 <strong>How it works:</strong> Your total overtime is offset against any late time recorded during the month. 
            Only the <em>net positive overtime</em> (overtime minus lateness) qualifies for the reward. 
            This encourages both punctuality and dedication.
          </Text>
        </Section>

        {department && (
          <Text style={metaText}>Department: {department}{position ? ` • Position: ${position}` : ''}</Text>
        )}

        <Text style={footer}>
          Thank you for going above and beyond. Your hard work does not go unnoticed! 💪<br />
          — {SITE_NAME} Management
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OvertimeRewardEmail,
  subject: (data: Record<string, any>) =>
    `🎉 Overtime Reward: UGX ${(data.rewardAmount || 0).toLocaleString()} — ${data.month || 'Monthly'}`,
  displayName: 'Overtime reward notification',
  previewData: {
    employeeName: 'Tumwine Alex',
    department: 'Quality Control',
    position: 'EUDR',
    month: 'March 2026',
    totalOvertimeMinutes: 1612,
    totalLateMinutes: 823,
    netOvertimeMinutes: 789,
    netOvertimeHours: 14,
    ratePerHour: 3000,
    rewardAmount: 42000,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const brandText = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0' }
const heroBanner = { backgroundColor: '#1a5c1a', borderRadius: '12px', padding: '24px 20px', margin: '0 0 20px', textAlign: 'center' as const }
const heroEmoji = { fontSize: '36px', margin: '0 0 8px' }
const heroTitle = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 4px' }
const heroSubtitle = { fontSize: '14px', color: '#c8e6c9', margin: '0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '10px 0 16px' }
const text = { fontSize: '14px', color: '#444444', lineHeight: '1.6', margin: '0 0 20px' }
const breakdownBox = { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '18px 20px', margin: '0 0 16px', border: '1px solid #e9ecef' }
const breakdownTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '0 0 8px' }
const divider = { borderColor: '#dee2e6', margin: '10px 0' }
const dividerLight = { borderColor: '#e8f5e9', margin: '8px 0' }
const rowStyle = { margin: '8px 0' }
const labelStyle = { fontSize: '13px', color: '#666666', margin: '0 0 2px' }
const labelStyleBold = { fontSize: '13px', color: '#333333', fontWeight: 'bold' as const, margin: '0 0 2px' }
const valueStyle = { fontSize: '15px', color: '#333333', fontWeight: '600' as const, margin: '0' }
const valueStyleRed = { fontSize: '15px', color: '#d32f2f', fontWeight: '600' as const, margin: '0' }
const valueStyleGreen = { fontSize: '15px', color: '#2e7d32', fontWeight: 'bold' as const, margin: '0' }
const calculationBox = { backgroundColor: '#e8f5e9', borderRadius: '10px', padding: '16px 20px', margin: '0 0 16px', border: '1px solid #a5d6a7' }
const calcTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#2e7d32', margin: '0 0 6px' }
const calcRow = { fontSize: '14px', color: '#333333', margin: '6px 0', textAlign: 'center' as const }
const rewardAmountStyle = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a5c1a', margin: '4px 0 0', textAlign: 'center' as const }
const rewardBadge = { backgroundColor: '#1a5c1a', borderRadius: '10px', padding: '18px 20px', margin: '0 0 20px', textAlign: 'center' as const }
const rewardBadgeLabel = { fontSize: '11px', color: '#c8e6c9', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '1.5px' }
const rewardBadgeAmount = { fontSize: '30px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0' }
const infoBox = { backgroundColor: '#e3f2fd', borderRadius: '8px', padding: '14px 16px', margin: '0 0 16px', border: '1px solid #90caf9' }
const infoText = { fontSize: '13px', color: '#1565c0', margin: '0', lineHeight: '1.5' }
const noteBox = { backgroundColor: '#fff8e1', borderRadius: '8px', padding: '14px 16px', margin: '0 0 20px', border: '1px solid #ffe082' }
const noteText = { fontSize: '12px', color: '#f57f17', margin: '0', lineHeight: '1.5' }
const metaText = { fontSize: '12px', color: '#999999', margin: '0 0 10px' }
const footer = { fontSize: '13px', color: '#666666', margin: '20px 0 0', lineHeight: '1.5', borderTop: '1px solid #eee', paddingTop: '16px' }
