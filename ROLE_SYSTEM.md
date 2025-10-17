# Role & Permission System

## Role Hierarchy

### 1. Super Admin (System Administrator)
**Who**: System owner (nicholusscottlangz@gmail.com)
**Access Level**: FULL SYSTEM ACCESS
**Capabilities**:
- ✅ Manage all permissions
- ✅ Create, edit, and DELETE any records
- ✅ Access ALL departments and modules
- ✅ Assign and revoke roles
- ✅ System-wide configurations
- ✅ View all data across departments
- ✅ Approve and reject requests
- ✅ Override any restrictions

### 2. Administrator
**Who**: Delegated approvers with limited access
**Access Level**: APPROVAL RIGHTS ONLY
**Capabilities**:
- ✅ View reports and dashboards
- ✅ Approve/reject requests (payments, quality assessments, etc.)
- ❌ Cannot change records or settings
- ❌ Cannot access permission management
- ❌ Cannot delete records
- ❌ Cannot assign roles
- ❌ Limited to read-only access except for approvals
- ❌ Cannot view/edit employee salaries
- ❌ Cannot create new records

**Use Case**: When you need someone to help with approvals but don't want them changing system data.

### 3. Manager
**Who**: Department managers
**Access Level**: Department-specific management
**Capabilities**:
- ✅ Manage their department's operations
- ✅ View department-specific data
- ✅ Create and edit records in their domain
- ✅ Approve requests for their department
- ❌ Cannot access other departments' data
- ❌ Cannot manage system-wide settings
- ❌ Cannot delete records without approval

### 4. User
**Who**: Regular employees
**Access Level**: Assigned permissions only
**Capabilities**:
- ✅ Access assigned modules only
- ✅ Perform tasks based on granted permissions
- ❌ No approval rights
- ❌ Limited to own department

## Permission System

In addition to roles, users can be assigned **granular permissions**:

### Permission Format
- **Module Level**: `Finance`, `Quality Control`, `Procurement`
- **Granular Level**: `Finance:view`, `Finance:create`, `Finance:approve`

### Permission Examples
- `Quality Control` - Can access quality control features
- `Finance:view` - Can view finance data but not modify
- `Finance:approve` - Can approve financial requests
- `Store Management:create` - Can create store records

## How It Works Together

1. **Super Admin** bypasses all permission checks - has access to everything
2. **Administrator** can approve requests but permissions still control what they can view
3. **Manager/User** require specific permissions for each action

## Assigning Roles

### To Make Someone an Administrator (Limited Access):
```sql
UPDATE employees 
SET role = 'Administrator'
WHERE email = 'user@example.com';
```

**Remember**: Administrators can approve but NOT modify data. They don't get access to permissions management.

### To Make Someone a Super Admin (DANGEROUS):
```sql
UPDATE employees 
SET role = 'Super Admin'
WHERE email = 'trusted-admin@example.com';
```

**Warning**: Only assign Super Admin to fully trusted personnel. They have complete system control.

## Security Best Practices

1. **Keep Super Admin count minimal** - Ideally only 1-2 people
2. **Use Administrator for approvers** - They can help with workflows without risks
3. **Use Managers for department heads** - Scoped access to their domain
4. **Use granular permissions** - Give Users only what they need
5. **Audit regularly** - Review who has what access periodically

## Database Functions

- `is_current_user_admin()` - Returns true only for Super Admin
- `is_current_user_administrator()` - Returns true for Administrator OR Super Admin
- `user_has_permission('permission_name')` - Checks specific permission

## Frontend Access Control

```typescript
const { isSuperAdmin, isAdministrator, hasPermission } = useAuth();

// For full system access features
if (isSuperAdmin()) {
  // Show permission management, delete buttons, etc.
}

// For approval features
if (isAdministrator() || isSuperAdmin()) {
  // Show approve/reject buttons
}

// For specific features
if (hasPermission('Finance:create')) {
  // Show create payment button
}
```
