// Centralized permission definitions for the Coffee ERP system

export const PERMISSION_CATEGORIES = {
  OPERATIONS: 'Operations',
  MANAGEMENT: 'Management', 
  SYSTEM: 'System',
  ADMINISTRATION: 'Administration'
} as const;

export const PERMISSIONS = {
  // Operations
  QUALITY_CONTROL: 'Quality Control',
  STORE_MANAGEMENT: 'Store Management',
  EUDR_DOCUMENTATION: 'EUDR Documentation',
  MILLING: 'Milling',
  INVENTORY: 'Inventory',
  FIELD_OPERATIONS: 'Field Operations',
  PROCUREMENT: 'Procurement',
  PROCESSING: 'Processing',
  
  // Management
  SALES_MARKETING: 'Sales Marketing',
  FINANCE: 'Finance',
  HUMAN_RESOURCES: 'Human Resources',
  DATA_ANALYSIS: 'Data Analysis',
  IT_MANAGEMENT: 'IT Management',
  LOGISTICS: 'Logistics',
  
  // System
  REPORTS: 'Reports',
  GENERAL_ACCESS: 'General Access',
  
  // Administration
  ADMIN_ALL: '*', // Wildcard permission for full admin access
  USER_MANAGEMENT: 'User Management',
  PERMISSION_MANAGEMENT: 'Permission Management'
} as const;

export const PERMISSION_DETAILS = {
  [PERMISSIONS.QUALITY_CONTROL]: {
    name: 'Quality Control',
    description: 'Access to quality assessment and control features',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    icon: 'ClipboardCheck'
  },
  [PERMISSIONS.STORE_MANAGEMENT]: {
    name: 'Store Management',
    description: 'Manage coffee storage, EUDR documentation, and inventory',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    icon: 'Shield'
  },
  [PERMISSIONS.MILLING]: {
    name: 'Milling',
    description: 'Access to milling operations and customer management',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    icon: 'Coffee'
  },
  [PERMISSIONS.INVENTORY]: {
    name: 'Inventory',
    description: 'Manage inventory items and stock levels',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    icon: 'Package'
  },
  [PERMISSIONS.FIELD_OPERATIONS]: {
    name: 'Field Operations',
    description: 'Manage field operations and buying stations',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    icon: 'MapPin'
  },
  [PERMISSIONS.PROCUREMENT]: {
    name: 'Procurement',
    description: 'Handle supplier relationships and purchase orders',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    icon: 'Truck'
  },
  [PERMISSIONS.PROCESSING]: {
    name: 'Processing',
    description: 'Manage coffee processing operations',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    icon: 'Settings'
  },
  [PERMISSIONS.EUDR_DOCUMENTATION]: {
    name: 'EUDR Documentation',
    description: 'Access EU Deforestation Regulation documentation and compliance',
    category: PERMISSION_CATEGORIES.OPERATIONS,
    icon: 'FileText'
  },
  [PERMISSIONS.SALES_MARKETING]: {
    name: 'Sales Marketing',
    description: 'Access sales data and marketing campaigns',
    category: PERMISSION_CATEGORIES.MANAGEMENT,
    icon: 'TrendingUp'
  },
  [PERMISSIONS.FINANCE]: {
    name: 'Finance',
    description: 'Manage financial transactions and payments',
    category: PERMISSION_CATEGORIES.MANAGEMENT,
    icon: 'DollarSign'
  },
  [PERMISSIONS.HUMAN_RESOURCES]: {
    name: 'Human Resources',
    description: 'Manage employees and HR operations',
    category: PERMISSION_CATEGORIES.MANAGEMENT,
    icon: 'Users'
  },
  [PERMISSIONS.DATA_ANALYSIS]: {
    name: 'Data Analysis',
    description: 'Access analytics and business intelligence tools',
    category: PERMISSION_CATEGORIES.MANAGEMENT,
    icon: 'LineChart'
  },
  [PERMISSIONS.IT_MANAGEMENT]: {
    name: 'IT Management',
    description: 'System administration and IT operations',
    category: PERMISSION_CATEGORIES.MANAGEMENT,
    icon: 'Settings'
  },
  [PERMISSIONS.LOGISTICS]: {
    name: 'Logistics',
    description: 'Manage shipping and logistics operations',
    category: PERMISSION_CATEGORIES.MANAGEMENT,
    icon: 'Truck'
  },
  [PERMISSIONS.REPORTS]: {
    name: 'Reports',
    description: 'Access system reports and dashboards',
    category: PERMISSION_CATEGORIES.SYSTEM,
    icon: 'FileText'
  },
  [PERMISSIONS.GENERAL_ACCESS]: {
    name: 'General Access',
    description: 'Basic system access for all users',
    category: PERMISSION_CATEGORIES.SYSTEM,
    icon: 'Key'
  },
  [PERMISSIONS.ADMIN_ALL]: {
    name: 'Administrator (All Permissions)',
    description: 'Full system access - all permissions granted',
    category: PERMISSION_CATEGORIES.ADMINISTRATION,
    icon: 'Crown'
  },
  [PERMISSIONS.USER_MANAGEMENT]: {
    name: 'User Management',
    description: 'Create and manage user accounts',
    category: PERMISSION_CATEGORIES.ADMINISTRATION,
    icon: 'UserCog'
  },
  [PERMISSIONS.PERMISSION_MANAGEMENT]: {
    name: 'Permission Management',
    description: 'Assign and manage user permissions',
    category: PERMISSION_CATEGORIES.ADMINISTRATION,
    icon: 'Shield'
  }
} as const;

export const ROLE_PERMISSION_PRESETS = {
  Administrator: [PERMISSIONS.ADMIN_ALL],
  Manager: [
    PERMISSIONS.REPORTS,
    PERMISSIONS.DATA_ANALYSIS,
    PERMISSIONS.HUMAN_RESOURCES,
    PERMISSIONS.FINANCE,
    PERMISSIONS.USER_MANAGEMENT
  ],
  'Quality Manager': [
    PERMISSIONS.QUALITY_CONTROL,
    PERMISSIONS.REPORTS,
    PERMISSIONS.STORE_MANAGEMENT,
    PERMISSIONS.EUDR_DOCUMENTATION
  ],
  'Store Manager': [
    PERMISSIONS.STORE_MANAGEMENT,
    PERMISSIONS.INVENTORY,
    PERMISSIONS.REPORTS,
    PERMISSIONS.EUDR_DOCUMENTATION
  ],
  'Finance Manager': [
    PERMISSIONS.FINANCE,
    PERMISSIONS.REPORTS,
    PERMISSIONS.DATA_ANALYSIS
  ],
  'Field Supervisor': [
    PERMISSIONS.FIELD_OPERATIONS,
    PERMISSIONS.PROCUREMENT,
    PERMISSIONS.REPORTS
  ],
  User: [PERMISSIONS.GENERAL_ACCESS]
} as const;

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type PermissionCategory = typeof PERMISSION_CATEGORIES[keyof typeof PERMISSION_CATEGORIES];
export type RoleType = keyof typeof ROLE_PERMISSION_PRESETS;