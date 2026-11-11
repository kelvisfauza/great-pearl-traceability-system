import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { Banknote, Bell, Building2, FileText, HardDrive, KeyRound, Shield, Users, Wrench, type LucideIcon } from "lucide-react";

export const settingsCategories = [
  { id: "people", label: "People & access", icon: Users },
  { id: "money", label: "Money & loans", icon: Banknote },
  { id: "messages", label: "Messages & reminders", icon: Bell },
  { id: "operations", label: "Business operations", icon: Building2 },
  { id: "security", label: "Security & history", icon: Shield },
  { id: "maintenance", label: "Maintenance & backup", icon: Wrench },
] as const;

export interface SettingsTool {
  id: string;
  category: typeof settingsCategories[number]["id"];
  title: string;
  keywords: string;
  icon: LucideIcon;
  component?: LazyExoticComponent<ComponentType>;
  path?: string;
  advanced?: boolean;
}

export const settingsTools: SettingsTool[] = [
  { id: "permissions", category: "people", title: "Staff permissions", keywords: "department modules access rights", icon: KeyRound, component: lazy(() => import("./UnifiedPermissionManager")) },
  { id: "accounts", category: "people", title: "Enable or disable accounts", keywords: "block login staff active", icon: Users, component: lazy(() => import("./AccountStatusManager")) },
  { id: "suspensions", category: "people", title: "Employee suspensions", keywords: "forced leave suspended", icon: Users, component: lazy(() => import("./EmployeeSuspensionManager")) },
  { id: "roles", category: "people", title: "Staff roles", keywords: "assign administrator finance manager", icon: KeyRound, component: lazy(() => import("./RoleAssignmentManager")) },
  { id: "permission-approvals", category: "people", title: "Permission change approvals", keywords: "review access requests", icon: Shield, component: lazy(() => import("./PermissionChangeApprovals").then(m => ({ default: m.PermissionChangeApprovals }))) },
  { id: "grn-role", category: "people", title: "GRN input access", keywords: "receipt finance role", icon: FileText, component: lazy(() => import("./GrnInputRoleManager")) },
  { id: "users", category: "people", title: "User permissions directory", keywords: "list employees rights", icon: Users, component: lazy(() => import("./UserPermissionsList")) },
  { id: "overview", category: "people", title: "Permission overview", keywords: "summary access roles", icon: Shield, component: lazy(() => import("./PermissionOverview")) },
  { id: "quick-permission", category: "people", title: "Quick permission assignment", keywords: "grant access staff", icon: KeyRound, component: lazy(() => import("./QuickPermissionAssignment")) },
  { id: "providers", category: "money", title: "Payment providers", keywords: "yo gosentepay mobile money routing", icon: Banknote, component: lazy(() => import("./ProviderSettings")) },
  { id: "wallet-ops", category: "money", title: "Wallet operations", keywords: "credit debit adjustment balance", icon: Banknote, component: lazy(() => import("./AdminWalletOperations")) },
  { id: "wallet-freeze", category: "money", title: "Freeze or unfreeze wallets", keywords: "withdrawals blocked frozen", icon: Shield, component: lazy(() => import("./WalletFreezeManager")) },
  { id: "sunday", category: "money", title: "Sunday withdrawal settings", keywords: "weekend withdrawals", icon: Banknote, component: lazy(() => import("./SundayWithdrawalSettings")) },
  { id: "overdraft", category: "money", title: "Overdraft usage rules", keywords: "borrowing balance penalty", icon: Banknote, component: lazy(() => import("./OverdraftUsageRules")) },
  { id: "loans", category: "money", title: "Loan policy", keywords: "business facility limits guarantor security", icon: Banknote, component: lazy(() => import("./LoanPolicySettings")) },
  { id: "treasury", category: "money", title: "Treasury accounts", keywords: "funding bank reconciliation deposits", icon: Building2, path: "/admin/treasury" },
  { id: "payouts", category: "money", title: "Payout status", keywords: "failed pending released payments", icon: Banknote, path: "/admin/payout-status" },
  { id: "budget", category: "money", title: "Budget management", keywords: "allocation budget withdrawal", icon: Banknote, path: "/admin/budget-management" },
  { id: "messaging", category: "messages", title: "Messaging providers & tests", keywords: "sms bulksms email test messages", icon: Bell, component: lazy(() => import("./MessagingSettings")) },
  { id: "reminders", category: "messages", title: "Report reminders", keywords: "daily morning analyst reports notifications", icon: Bell, component: lazy(() => import("../it/ReportRemindersSettings")) },
  { id: "communications", category: "messages", title: "Staff communications", keywords: "send announcements email sms", icon: Bell, path: "/communications" },
  { id: "payroll", category: "operations", title: "Payroll & staff payments", keywords: "salary nssf paye statutory", icon: Users, path: "/v2/hr/payroll" },
  { id: "hr", category: "operations", title: "Staff records & withdrawal limits", keywords: "human resources employee daily transaction limits allowances", icon: Users, path: "/v2/hr" },
  { id: "quality", category: "operations", title: "Coffee quality & pricing", keywords: "prices moisture defects assessments postings", icon: Building2, path: "/quality-control" },
  { id: "suppliers", category: "operations", title: "Supplier records", keywords: "names phone bank accounts", icon: Users, path: "/suppliers" },
  { id: "forms", category: "operations", title: "Company forms & expenses", keywords: "paper templates print meal plans agent banking", icon: FileText, path: "/expenses" },
  { id: "approvals", category: "operations", title: "Admin approvals", keywords: "loans requests meal plans review", icon: Shield, path: "/approvals" },
  { id: "security", category: "security", title: "Security policy", keywords: "login devices authentication sessions", icon: Shield, component: lazy(() => import("./SecuritySettings")) },
  { id: "audit", category: "security", title: "Audit history", keywords: "changes logs actions employee", icon: FileText, component: lazy(() => import("../it/AuditLogViewer").then(m => ({ default: m.AuditLogViewer }))) },
  { id: "deletions", category: "security", title: "Deletion requests", keywords: "remove records review", icon: Shield, component: lazy(() => import("./DeletionRequestsManager")) },
  { id: "super-admin", category: "security", title: "Super administrator setup", keywords: "privileged account create", icon: KeyRound, advanced: true, component: lazy(() => import("./SuperAdminCreator")) },
  { id: "maintenance", category: "maintenance", title: "Maintenance mode", keywords: "pause system availability", icon: Wrench, component: lazy(() => import("../it/MaintenanceToggle")) },
  { id: "downtime", category: "maintenance", title: "Scheduled downtime", keywords: "maintenance schedule", icon: Wrench, component: lazy(() => import("../it/ScheduledDowntimeSettings")) },
  { id: "backup", category: "maintenance", title: "Backups", keywords: "recovery restore export", icon: HardDrive, component: lazy(() => import("../it/BackupManagement")) },
  { id: "archive", category: "maintenance", title: "Data archives", keywords: "old history archive", icon: HardDrive, component: lazy(() => import("./DataArchiveManager").then(m => ({ default: m.DataArchiveManager }))) },
  { id: "cleanup", category: "maintenance", title: "Database cleanup", keywords: "delete old data", icon: Wrench, advanced: true, component: lazy(() => import("./DatabaseCleanupTool").then(m => ({ default: m.DatabaseCleanupTool }))) },
  { id: "migration", category: "maintenance", title: "Legacy data migration", keywords: "firebase import migration", icon: HardDrive, advanced: true, component: lazy(() => import("./FirebaseMigrationTool")) },
  { id: "supplier-codes", category: "maintenance", title: "Supplier code migration", keywords: "supplier sequential numbers", icon: HardDrive, advanced: true, component: lazy(() => import("../suppliers/MigrateSupplierCodesButton").then(m => ({ default: m.MigrateSupplierCodesButton }))) },
  { id: "batch-numbers", category: "maintenance", title: "Batch number migration", keywords: "inventory numbering format", icon: HardDrive, advanced: true, component: lazy(() => import("./MigrateBatchNumbersButton").then(m => ({ default: m.MigrateBatchNumbersButton }))) },
];