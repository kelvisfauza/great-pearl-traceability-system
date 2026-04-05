/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as verificationCode } from './verification-code.tsx'
import { template as priceUpdate } from './price-update.tsx'
import { template as easterGreeting } from './easter-greeting.tsx'
import { template as dailyQualitySummary } from './daily-quality-summary.tsx'
import { template as dailyAdminSummary } from './daily-admin-summary.tsx'
import { template as dailyOpsSummary } from './daily-ops-summary.tsx'
import { template as dailyFinanceSummary } from './daily-finance-summary.tsx'
import { template as dailyEudrSummary } from './daily-eudr-summary.tsx'
import { template as dailySalesSummary } from './daily-sales-summary.tsx'
import { template as systemUpdateAnnouncement } from './system-update-announcement.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'verification-code': verificationCode,
  'price-update': priceUpdate,
  'easter-greeting': easterGreeting,
  'daily-quality-summary': dailyQualitySummary,
  'daily-admin-summary': dailyAdminSummary,
  'daily-ops-summary': dailyOpsSummary,
  'daily-finance-summary': dailyFinanceSummary,
  'daily-eudr-summary': dailyEudrSummary,
  'daily-sales-summary': dailySalesSummary,
}
