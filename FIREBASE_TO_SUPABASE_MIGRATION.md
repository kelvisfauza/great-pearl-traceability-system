# Firebase to Supabase Migration Guide

## Overview

This guide will help you migrate all data from Firebase Firestore to Supabase PostgreSQL safely and efficiently.

## Pre-Migration Checklist

- [ ] **Backup Firebase data** - Export all collections
- [ ] **Verify Supabase tables exist** - All required tables are created
- [ ] **Test with small dataset** - Try migrating a single collection first
- [ ] **Document current Firebase usage** - Know which parts of code use Firebase
- [ ] **Set maintenance window** - Inform users if needed

## Migration Process

### Step 1: Access Migration Tool

1. Log in as Super Admin
2. Navigate to: **Settings → System → Firebase Migration**
3. The tool shows all collections ready for migration

### Step 2: Run Migration

#### Option A: Migrate All Collections (Recommended)
```
Click "Start Migration" button
```
This will migrate all collections in sequence:
- store_reports
- coffee_records  
- payment_records
- supplier_advances
- daily_tasks

#### Option B: Migrate Individual Collections
Use the `useFirebaseMigration` hook programmatically:
```typescript
const { migrateCollection } = useFirebaseMigration();
await migrateCollection('store_reports');
```

### Step 3: Verify Migration

After migration completes, verify data:

```sql
-- Check migrated store reports
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN migrated_from_firebase THEN 1 END) as from_firebase
FROM store_reports;

-- Check for duplicates
SELECT firebase_id, COUNT(*) 
FROM store_reports 
WHERE firebase_id IS NOT NULL
GROUP BY firebase_id 
HAVING COUNT(*) > 1;

-- Verify data integrity
SELECT date, coffee_type, COUNT(*) 
FROM store_reports 
GROUP BY date, coffee_type 
ORDER BY date DESC 
LIMIT 10;
```

### Step 4: Update Application Code

After successful migration, update code to use Supabase exclusively:

#### Before (Firebase):
```typescript
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const querySnapshot = await getDocs(collection(db, 'store_reports'));
const reports = querySnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

#### After (Supabase):
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data: reports, error } = await supabase
  .from('store_reports')
  .select('*')
  .order('date', { ascending: false });
```

### Step 5: Remove Firebase Dependencies

Once all code is updated:

1. **Update hooks that use Firebase**:
   - `src/hooks/useReports.ts` ✓
   - `src/hooks/useStoreReports.ts` ✓
   - Any other custom hooks

2. **Remove Firebase imports** from components

3. **Uninstall Firebase packages** (after thorough testing):
   ```bash
   npm uninstall firebase
   ```

4. **Delete Firebase files**:
   - `src/lib/firebase.ts`
   - Any Firebase-specific utilities

## Data Mapping

### Store Reports
| Firebase Field | Supabase Column |
|---------------|----------------|
| date | date |
| coffee_type | coffee_type |
| kilograms_bought | kilograms_bought |
| average_buying_price | average_buying_price |
| kilograms_sold | kilograms_sold |
| bags_sold | bags_sold |
| sold_to | sold_to |
| bags_left | bags_left |
| kilograms_left | kilograms_left |
| [Firebase Doc ID] | firebase_id |

### Coffee Records
| Firebase Field | Supabase Column |
|---------------|----------------|
| date | date |
| batch_number / batchNumber | batch_number |
| supplier_name / supplierName | supplier_name |
| coffee_type / coffeeType | coffee_type |
| bags | bags |
| kilograms / kgs | kilograms |
| status | status |

### Payment Records
| Firebase Field | Supabase Column |
|---------------|----------------|
| supplier_name / supplierName | supplier_name |
| payment_date / date | payment_date |
| amount | amount |
| payment_method / paymentMethod | payment_method |
| reference / ref | reference |

### Supplier Advances
| Firebase Field | Supabase Column |
|---------------|----------------|
| supplier_name / supplierName | supplier_name |
| advance_date / date | advance_date |
| amount_ugx / amount | amount_ugx |
| recovered_ugx | recovered_ugx |
| balance_ugx / balance | balance_ugx |
| status | status |

### Daily Tasks
| Firebase Field | Supabase Column |
|---------------|----------------|
| date | date |
| task_type / taskType | task_type |
| description | description |
| department | department |
| completed_by / completedBy | completed_by |
| amount | amount |

## Migration Features

### Duplicate Prevention
- Records with existing `firebase_id` are skipped
- Prevents data duplication on re-runs
- Safe to run migration multiple times

### Error Handling
- Failed records are logged
- Migration continues even if some records fail
- Detailed error messages for debugging

### Progress Tracking
- Real-time progress for each collection
- Shows migrated/skipped/error counts
- Visual progress indicators

## Troubleshooting

### Issue: "Column does not exist" error
**Solution**: Verify table schema matches expected structure
```sql
\d+ store_reports;
```

### Issue: "Duplicate key value" error
**Solution**: Check for existing records with same ID
```sql
SELECT * FROM store_reports WHERE firebase_id = 'FIREBASE_DOC_ID';
```

### Issue: Migration timeout
**Solution**: Migrate collections individually instead of all at once

### Issue: Data type mismatch
**Solution**: Check Firebase data types match Supabase schema
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'store_reports';
```

## Post-Migration Testing

### Test Checklist
- [ ] All reports display correctly
- [ ] Create new report works
- [ ] Edit existing report works
- [ ] Delete report works
- [ ] File attachments accessible
- [ ] Search and filters work
- [ ] Date ranges work correctly
- [ ] Export functions work
- [ ] Print functions work

### Performance Testing
```sql
-- Test query performance
EXPLAIN ANALYZE 
SELECT * FROM store_reports 
WHERE date >= '2024-01-01' 
ORDER BY date DESC;
```

## Rollback Plan

If issues occur after migration:

1. **Keep Firebase data** - Don't delete until fully verified
2. **Revert code changes** - Use git to restore Firebase code
3. **Clear migrated data** (if needed):
   ```sql
   DELETE FROM store_reports WHERE migrated_from_firebase = true;
   DELETE FROM coffee_records WHERE migrated_from_firebase = true;
   -- etc.
   ```

## File Storage Migration

Store report files are already in Supabase Storage (`report-documents` bucket), so no file migration needed.

### Verify file access:
```sql
SELECT 
  id, 
  date, 
  attachment_url, 
  delivery_note_url,
  dispatch_report_url
FROM store_reports 
WHERE attachment_url IS NOT NULL 
LIMIT 5;
```

## Benefits After Migration

✅ **Single Database**: All data in Supabase  
✅ **Better Performance**: PostgreSQL query optimization  
✅ **Real-time Updates**: Built-in subscriptions  
✅ **Type Safety**: Auto-generated TypeScript types  
✅ **Row Level Security**: Fine-grained access control  
✅ **Simpler Code**: No dual-database synchronization  
✅ **Lower Costs**: One database to maintain  
✅ **Better Backups**: PostgreSQL backup tools  

## Support

For issues during migration:
1. Check edge function logs in Supabase dashboard
2. Review migration errors in the UI tool
3. Check console logs for detailed error messages
4. Contact system administrator

## Timeline

**Recommended Migration Schedule:**
- Week 1: Test migration with single collection
- Week 2: Full migration during low-traffic period
- Week 3: Monitor and verify all features
- Week 4: Remove Firebase dependencies