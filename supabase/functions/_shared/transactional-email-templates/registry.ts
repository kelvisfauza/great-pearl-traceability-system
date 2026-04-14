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
import { template as withdrawalVerification } from './withdrawal-verification.tsx'
import { template as loanGuarantorCode } from './loan-guarantor-code.tsx'
import { template as loanApprovalDetails } from './loan-approval-details.tsx'
import { template as dailyWalletSummary } from './daily-wallet-summary.tsx'
import { template as salaryCredited } from './salary-credited.tsx'
import { template as allowanceCredited } from './allowance-credited.tsx'
import { template as loanRepayment } from './loan-repayment.tsx'
import { template as guarantorRecovery } from './guarantor-recovery.tsx'
import { template as loanReminder } from './loan-reminder.tsx'
import { template as loanRejected } from './loan-rejected.tsx'
import { template as loanGuarantorResponse } from './loan-guarantor-response.tsx'
import { template as loanCounterOffer } from './loan-counter-offer.tsx'
import { template as loanGuarantorRevoked } from './loan-guarantor-revoked.tsx'
import { template as approvalAction } from './approval-action.tsx'
import { template as newDeviceAlert } from './new-device-alert.tsx'
import { template as priceApprovalRequest } from './price-approval-request.tsx'
import { template as walletTransfer } from './wallet-transfer.tsx'
import { template as transactionStatement } from './transaction-statement.tsx'
import { template as salaryAdvanceConfirmation } from './salary-advance-confirmation.tsx'
import { template as cashWithdrawalConfirmation } from './cash-withdrawal-confirmation.tsx'
import { template as overtimeReward } from './overtime-reward.tsx'
import { template as priceReminder } from './price-reminder.tsx'
import { template as loanPromotion } from './loan-promotion.tsx'
import { template as taskAssignment } from './task-assignment.tsx'
import { template as jobApplicationStatus } from './job-application-status.tsx'
import { template as employeeOfTheMonth } from './employee-of-the-month.tsx'
import { template as dailyInventorySummary } from './daily-inventory-summary.tsx'
import { template as bonusClaimed } from './bonus-claimed.tsx'
import { template as dailyProcurementSummary } from './daily-procurement-summary.tsx'
import { template as salaryReductionNotice } from './salary-reduction-notice.tsx'
import { template as supplierPriceNotice } from './supplier-price-notice.tsx'
import { template as supplierContractNotice } from './supplier-contract-notice.tsx'
import { template as supplierUpdateNotice } from './supplier-update-notice.tsx'
import { template as adminWithdrawalPin } from './admin-withdrawal-pin.tsx'
import { template as adminWithdrawalConfirmed } from './admin-withdrawal-confirmed.tsx'
import { template as investmentConfirmation } from './investment-confirmation.tsx'
import { template as instantWithdrawalConfirmation } from './instant-withdrawal-confirmation.tsx'
import { template as requestExpiredRefund } from './request-expired-refund.tsx'
import { template as generalNotification } from './general-notification.tsx'
import { template as withdrawalAuthRequest } from './withdrawal-auth-request.tsx'
import { template as instantWithdrawalApprovalRequest } from './instant-withdrawal-approval-request.tsx'
import { template as mealDisbursementNotification } from './meal-disbursement-notification.tsx'
import { template as titleChangeConfirmation } from './title-change-confirmation.tsx'

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
  'system-update-announcement': systemUpdateAnnouncement,
  'withdrawal-verification': withdrawalVerification,
  'loan-guarantor-code': loanGuarantorCode,
  'loan-approval-details': loanApprovalDetails,
  'daily-wallet-summary': dailyWalletSummary,
  'salary-credited': salaryCredited,
  'allowance-credited': allowanceCredited,
  'loan-repayment': loanRepayment,
  'guarantor-recovery': guarantorRecovery,
  'loan-reminder': loanReminder,
  'loan-rejected': loanRejected,
  'loan-guarantor-response': loanGuarantorResponse,
  'loan-counter-offer': loanCounterOffer,
  'loan-guarantor-revoked': loanGuarantorRevoked,
  'approval-action': approvalAction,
  'new-device-alert': newDeviceAlert,
  'price-approval-request': priceApprovalRequest,
  'wallet-transfer': walletTransfer,
  'transaction-statement': transactionStatement,
  'salary-advance-confirmation': salaryAdvanceConfirmation,
  'cash-withdrawal-confirmation': cashWithdrawalConfirmation,
  'overtime-reward': overtimeReward,
  'price-reminder': priceReminder,
  'loan-promotion': loanPromotion,
  'task-assignment': taskAssignment,
  'job-application-status': jobApplicationStatus,
  'employee-of-the-month': employeeOfTheMonth,
  'daily-inventory-summary': dailyInventorySummary,
  'bonus-claimed': bonusClaimed,
  'daily-procurement-summary': dailyProcurementSummary,
  'salary-reduction-notice': salaryReductionNotice,
  'supplier-price-notice': supplierPriceNotice,
  'supplier-contract-notice': supplierContractNotice,
  'supplier-update-notice': supplierUpdateNotice,
  'admin-withdrawal-pin': adminWithdrawalPin,
  'admin-withdrawal-confirmed': adminWithdrawalConfirmed,
  'investment-confirmation': investmentConfirmation,
  'instant-withdrawal-confirmation': instantWithdrawalConfirmation,
  'request-expired-refund': requestExpiredRefund,
  'general-notification': generalNotification,
  'withdrawal-auth-request': withdrawalAuthRequest,
  'instant-withdrawal-approval-request': instantWithdrawalApprovalRequest,
  'meal-disbursement-notification': mealDisbursementNotification,
  'title-change-confirmation': titleChangeConfirmation,
}
