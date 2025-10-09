// Granular permission system with action-level controls
// This allows fine-grained control: e.g., "Finance:View" vs "Finance:Process"

export const PERMISSION_ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  PROCESS: 'process',
  APPROVE: 'approve',
  DOWNLOAD: 'download',
  EXPORT: 'export',
  PRINT: 'print',
  MANAGE: 'manage', // Full control
} as const;

export type PermissionAction = typeof PERMISSION_ACTIONS[keyof typeof PERMISSION_ACTIONS];

// Modules in the system
export const PERMISSION_MODULES = {
  FINANCE: 'Finance',
  STORE: 'Store Management',
  QUALITY: 'Quality Control',
  PROCUREMENT: 'Procurement',
  HR: 'Human Resources',
  INVENTORY: 'Inventory',
  SALES: 'Sales Marketing',
  REPORTS: 'Reports',
  MILLING: 'Milling',
  EUDR: 'EUDR Documentation',
  PROCESSING: 'Processing',
  FIELD_OPS: 'Field Operations',
  LOGISTICS: 'Logistics',
  DATA_ANALYSIS: 'Data Analysis',
  IT: 'IT Management',
} as const;

export type PermissionModule = typeof PERMISSION_MODULES[keyof typeof PERMISSION_MODULES];

// Define which actions are available for each module
export const MODULE_ACTIONS: Record<PermissionModule, PermissionAction[]> = {
  [PERMISSION_MODULES.FINANCE]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.PROCESS,
    PERMISSION_ACTIONS.APPROVE,
    PERMISSION_ACTIONS.DOWNLOAD,
    PERMISSION_ACTIONS.EXPORT,
    PERMISSION_ACTIONS.PRINT,
  ],
  [PERMISSION_MODULES.STORE]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.DELETE,
    PERMISSION_ACTIONS.EXPORT,
    PERMISSION_ACTIONS.PRINT,
  ],
  [PERMISSION_MODULES.QUALITY]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.APPROVE,
    PERMISSION_ACTIONS.EXPORT,
    PERMISSION_ACTIONS.PRINT,
  ],
  [PERMISSION_MODULES.PROCUREMENT]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.APPROVE,
    PERMISSION_ACTIONS.PROCESS,
    PERMISSION_ACTIONS.DOWNLOAD,
  ],
  [PERMISSION_MODULES.HR]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.DELETE,
    PERMISSION_ACTIONS.APPROVE,
    PERMISSION_ACTIONS.PROCESS,
    PERMISSION_ACTIONS.DOWNLOAD,
  ],
  [PERMISSION_MODULES.INVENTORY]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.EXPORT,
  ],
  [PERMISSION_MODULES.SALES]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.PROCESS,
    PERMISSION_ACTIONS.EXPORT,
    PERMISSION_ACTIONS.PRINT,
  ],
  [PERMISSION_MODULES.REPORTS]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.DOWNLOAD,
    PERMISSION_ACTIONS.EXPORT,
    PERMISSION_ACTIONS.PRINT,
  ],
  [PERMISSION_MODULES.MILLING]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.PROCESS,
    PERMISSION_ACTIONS.EXPORT,
  ],
  [PERMISSION_MODULES.EUDR]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.APPROVE,
    PERMISSION_ACTIONS.DOWNLOAD,
    PERMISSION_ACTIONS.PRINT,
  ],
  [PERMISSION_MODULES.PROCESSING]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.MANAGE,
  ],
  [PERMISSION_MODULES.FIELD_OPS]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.MANAGE,
  ],
  [PERMISSION_MODULES.LOGISTICS]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.CREATE,
    PERMISSION_ACTIONS.EDIT,
    PERMISSION_ACTIONS.MANAGE,
  ],
  [PERMISSION_MODULES.DATA_ANALYSIS]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.DOWNLOAD,
    PERMISSION_ACTIONS.EXPORT,
  ],
  [PERMISSION_MODULES.IT]: [
    PERMISSION_ACTIONS.VIEW,
    PERMISSION_ACTIONS.MANAGE,
  ],
};

// Action descriptions for UI
export const ACTION_DESCRIPTIONS: Record<PermissionAction, string> = {
  [PERMISSION_ACTIONS.VIEW]: 'Can view and read data',
  [PERMISSION_ACTIONS.CREATE]: 'Can create new records',
  [PERMISSION_ACTIONS.EDIT]: 'Can modify existing records',
  [PERMISSION_ACTIONS.DELETE]: 'Can delete records',
  [PERMISSION_ACTIONS.PROCESS]: 'Can process transactions and requests',
  [PERMISSION_ACTIONS.APPROVE]: 'Can approve requests and actions',
  [PERMISSION_ACTIONS.DOWNLOAD]: 'Can download files and documents',
  [PERMISSION_ACTIONS.EXPORT]: 'Can export data',
  [PERMISSION_ACTIONS.PRINT]: 'Can print documents',
  [PERMISSION_ACTIONS.MANAGE]: 'Full management access',
};

// Helper function to create a granular permission string
export const createPermission = (module: PermissionModule, action: PermissionAction): string => {
  return `${module}:${action}`;
};

// Helper function to parse a granular permission string
export const parsePermission = (permission: string): { module: PermissionModule | null; action: PermissionAction | null } => {
  const parts = permission.split(':');
  if (parts.length !== 2) {
    return { module: null, action: null };
  }
  return {
    module: parts[0] as PermissionModule,
    action: parts[1] as PermissionAction,
  };
};

// Helper function to check if a permission string is granular
export const isGranularPermission = (permission: string): boolean => {
  return permission.includes(':');
};

// Role presets with granular permissions
export const GRANULAR_ROLE_PRESETS: Record<string, string[]> = {
  Administrator: ['*'], // Wildcard - all permissions
  
  'Finance Manager': [
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.CREATE),
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.EDIT),
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.PROCESS),
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.APPROVE),
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.DOWNLOAD),
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.EXPORT),
    createPermission(PERMISSION_MODULES.REPORTS, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.REPORTS, PERMISSION_ACTIONS.DOWNLOAD),
  ],
  
  'Finance Assistant': [
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.CREATE),
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.PROCESS),
  ],
  
  'Store Manager': [
    createPermission(PERMISSION_MODULES.STORE, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.STORE, PERMISSION_ACTIONS.CREATE),
    createPermission(PERMISSION_MODULES.STORE, PERMISSION_ACTIONS.EDIT),
    createPermission(PERMISSION_MODULES.STORE, PERMISSION_ACTIONS.DELETE),
    createPermission(PERMISSION_MODULES.INVENTORY, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.EUDR, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.EUDR, PERMISSION_ACTIONS.CREATE),
  ],
  
  'Store Clerk': [
    createPermission(PERMISSION_MODULES.STORE, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.STORE, PERMISSION_ACTIONS.CREATE),
    createPermission(PERMISSION_MODULES.INVENTORY, PERMISSION_ACTIONS.VIEW),
  ],
  
  'Quality Manager': [
    createPermission(PERMISSION_MODULES.QUALITY, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.QUALITY, PERMISSION_ACTIONS.CREATE),
    createPermission(PERMISSION_MODULES.QUALITY, PERMISSION_ACTIONS.EDIT),
    createPermission(PERMISSION_MODULES.QUALITY, PERMISSION_ACTIONS.APPROVE),
    createPermission(PERMISSION_MODULES.STORE, PERMISSION_ACTIONS.VIEW),
  ],
  
  'HR Manager': [
    createPermission(PERMISSION_MODULES.HR, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.HR, PERMISSION_ACTIONS.CREATE),
    createPermission(PERMISSION_MODULES.HR, PERMISSION_ACTIONS.EDIT),
    createPermission(PERMISSION_MODULES.HR, PERMISSION_ACTIONS.APPROVE),
    createPermission(PERMISSION_MODULES.HR, PERMISSION_ACTIONS.PROCESS),
  ],
  
  'Procurement Officer': [
    createPermission(PERMISSION_MODULES.PROCUREMENT, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.PROCUREMENT, PERMISSION_ACTIONS.CREATE),
    createPermission(PERMISSION_MODULES.PROCUREMENT, PERMISSION_ACTIONS.EDIT),
  ],
  
  'Data Analyst': [
    createPermission(PERMISSION_MODULES.DATA_ANALYSIS, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.DATA_ANALYSIS, PERMISSION_ACTIONS.EXPORT),
    createPermission(PERMISSION_MODULES.REPORTS, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.REPORTS, PERMISSION_ACTIONS.CREATE),
    createPermission(PERMISSION_MODULES.REPORTS, PERMISSION_ACTIONS.DOWNLOAD),
  ],
  
  'Viewer': [
    createPermission(PERMISSION_MODULES.FINANCE, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.STORE, PERMISSION_ACTIONS.VIEW),
    createPermission(PERMISSION_MODULES.REPORTS, PERMISSION_ACTIONS.VIEW),
  ],
};

// Helper to get all actions for a user in a specific module
export const getUserModuleActions = (permissions: string[], module: PermissionModule): PermissionAction[] => {
  // Check for wildcard admin permission
  if (permissions.includes('*')) {
    return MODULE_ACTIONS[module] || [];
  }
  
  const actions: PermissionAction[] = [];
  permissions.forEach(permission => {
    const parsed = parsePermission(permission);
    if (parsed.module === module && parsed.action) {
      actions.push(parsed.action);
    }
  });
  
  return actions;
};

// Helper to check if user has a specific granular permission
export const hasGranularPermission = (
  userPermissions: string[],
  module: PermissionModule,
  action: PermissionAction
): boolean => {
  // Check for wildcard admin permission
  if (userPermissions.includes('*')) {
    return true;
  }
  
  const requiredPermission = createPermission(module, action);
  return userPermissions.includes(requiredPermission);
};
