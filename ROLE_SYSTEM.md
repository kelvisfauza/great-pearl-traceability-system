# Role & Permission System - Granular Hierarchy

## Role Hierarchy (5 Levels)

### 1. Super Admin (System Administrator)
**Who**: System owner (nicholusscottlangz@gmail.com)
**Access Level**: FULL SYSTEM ACCESS
**UI Elements**: All buttons visible (Edit, Delete, Print, Approve, Export)

**Capabilities**:
- ✅ View, Create, Edit, Delete, Approve, Print, Export
- ✅ Manage all permissions and roles
- ✅ Access ALL departments and modules
- ✅ System-wide configurations
- ✅ Override any restrictions
- ✅ Delete any records
- ✅ Modify system data

**Use Case**: Complete system control - assign only to fully trusted personnel.

---

### 2. Manager
**Who**: Department managers and senior decision-makers
**Access Level**: FULL OPERATIONAL ACCESS
**UI Elements**: Edit, Delete, Print, Approve, Export buttons visible

**Capabilities**:
- ✅ View, Create, Edit, Delete, Approve, Print, Export
- ✅ Approve requests and payments
- ✅ Print and export reports
- ✅ Delete records in their domain
- ✅ View all departments' data
- ✅ Make critical decisions
- ❌ Cannot manage system permissions/roles
- ❌ Cannot modify system settings

**Use Case**: Department heads who need full operational control but not system administration.

---

### 3. Administrator
**Who**: Delegated approvers (Finance, HR heads)
**Access Level**: APPROVAL + LIMITED OPERATIONS
**UI Elements**: Edit, Print, Approve, Export buttons visible (NO Delete)

**Capabilities**:
- ✅ View, Create, Edit, Approve, Print, Export
- ✅ Approve/reject requests (payments, quality assessments)
- ✅ Print reports and documents
- ✅ Export data
- ✅ Edit existing records
- ❌ Cannot DELETE any records
- ❌ Cannot access permission management
- ❌ Cannot assign roles
- ❌ Cannot modify system settings

**Use Case**: Senior staff who approve workflows but shouldn't delete data or access system admin features.

---

### 4. Supervisor
**Who**: Team leads and shift supervisors
**Access Level**: OPERATIONAL TASKS ONLY
**UI Elements**: Edit, Export buttons visible (NO Print, Delete, Approve)

**Capabilities**:
- ✅ View, Create, Edit, Export
- ✅ Manage daily operations
- ✅ Edit records in their domain
- ✅ Export data for reporting
- ❌ Cannot PRINT reports (must request from Manager)
- ❌ Cannot APPROVE requests
- ❌ Cannot DELETE records
- ❌ Cannot view other departments
- ❌ Limited to own department only

**Use Case**: Team leads who handle day-to-day operations but don't approve or print official documents.

---

### 5. User
**Who**: Regular employees, data entry staff
**Access Level**: DATA ENTRY ONLY
**UI Elements**: NO Edit, Delete, Print, Approve, or Export buttons visible

**Capabilities**:
- ✅ View records (own department only)
- ✅ Create new records (data entry)
- ✅ File reports (but cannot print them)
- ❌ Cannot EDIT existing records
- ❌ Cannot DELETE anything
- ❌ Cannot PRINT reports
- ❌ Cannot APPROVE requests
- ❌ Cannot EXPORT data
- ❌ No access to sensitive information
- ❌ Limited to assigned modules only

**Use Case**: Data entry staff and regular employees who only input data.

---

## Action Permission Matrix

| Action | User | Supervisor | Administrator | Manager | Super Admin |
|--------|------|------------|---------------|---------|-------------|
| **View** | ✅ (Own dept) | ✅ (Own dept) | ✅ (All depts) | ✅ (All depts) | ✅ (Everything) |
| **Create** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Delete** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Approve** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Print** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Export** | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## UI Element Visibility

### Edit Buttons
- **Visible for**: Supervisor, Administrator, Manager, Super Admin
- **Hidden for**: User

### Delete Buttons
- **Visible for**: Manager, Super Admin
- **Hidden for**: User, Supervisor, Administrator

### Print Buttons
- **Visible for**: Administrator, Manager, Super Admin
- **Hidden for**: User, Supervisor

### Approve Buttons
- **Visible for**: Administrator, Manager, Super Admin
- **Hidden for**: User, Supervisor

### Export Buttons
- **Visible for**: Supervisor, Administrator, Manager, Super Admin
- **Hidden for**: User

---

## Permission System

In addition to roles, users can be assigned **module-level permissions**:

### Permission Format
- **Module Level**: `Finance`, `Quality Control`, `Procurement`
- **Granular Level**: `Finance:view`, `Finance:create`, `Finance:approve`

### Permission Examples
- `Quality Control` - Can access quality control module
- `Finance` - Can access finance module
- `Store Management` - Can access store management module

### How Permissions Work with Roles
1. **Role determines actions** (view, create, edit, delete, approve, print, export)
2. **Permissions determine module access** (which departments/features user can see)
3. **Combined check**: User must have BOTH the role level AND the module permission

**Example**: A Supervisor with `Finance` permission can view, create, edit, and export finance data, but cannot approve payments or print reports.

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

### Using the new hooks

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';

const MyComponent = () => {
  const { canPerformAction, isSuperAdmin, isManager } = useAuth();
  const { 
    canSeeEditButton, 
    canSeeDeleteButton, 
    canSeePrintButton,
    canSeeApproveButton 
  } = useRolePermissions();

  return (
    <div>
      {/* Edit button - visible for Supervisor and above */}
      {canSeeEditButton && (
        <Button onClick={handleEdit}>Edit</Button>
      )}

      {/* Delete button - visible for Manager and Super Admin only */}
      {canSeeDeleteButton && (
        <Button onClick={handleDelete}>Delete</Button>
      )}

      {/* Print button - visible for Administrator, Manager, and Super Admin */}
      {canSeePrintButton && (
        <Button onClick={handlePrint}>Print</Button>
      )}

      {/* Approve button - visible for Administrator, Manager, and Super Admin */}
      {canSeeApproveButton && (
        <Button onClick={handleApprove}>Approve</Button>
      )}
    </div>
  );
};
```

### Action-based checks

```typescript
// Check if user can perform specific action
if (canPerformAction('delete')) {
  // Show delete functionality
}

if (canPerformAction('approve')) {
  // Show approve button
}

if (canPerformAction('print')) {
  // Show print options
}
```
