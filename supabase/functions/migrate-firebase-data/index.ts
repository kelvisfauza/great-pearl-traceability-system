import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MigrationResult {
  collection: string;
  total: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { firebaseData, collection } = await req.json()

    if (!firebaseData || !Array.isArray(firebaseData)) {
      throw new Error('Invalid firebaseData: must be an array')
    }

    console.log(`Starting migration for ${collection} with ${firebaseData.length} records`)

    const result: MigrationResult = {
      collection,
      total: firebaseData.length,
      migrated: 0,
      skipped: 0,
      errors: []
    }

    // Map Firebase collections to Supabase tables
    const collectionMapping: Record<string, string> = {
      'reports': 'store_reports',
      'store_reports': 'store_reports',
      'coffee_records': 'coffee_records',
      'payment_records': 'payment_records',
      'supplier_advances': 'supplier_advances',
      'daily_tasks': 'daily_tasks'
    }

    const supabaseTable = collectionMapping[collection]
    
    if (!supabaseTable) {
      throw new Error(`Unknown collection: ${collection}`)
    }

    // Process each record
    for (const record of firebaseData) {
      try {
        // Transform Firebase document to Supabase format
        const transformedRecord = transformFirebaseRecord(record, collection)
        
        // Check if record already exists (by firebase_id if available, or by other unique field)
        const checkField = transformedRecord.firebase_id ? 'firebase_id' : 'id'
        const checkValue = transformedRecord.firebase_id || transformedRecord.id
        
        const { data: existing } = await supabaseClient
          .from(supabaseTable)
          .select('id')
          .eq(checkField, checkValue)
          .single()

        if (existing) {
          console.log(`Record ${checkValue} already exists, skipping`)
          result.skipped++
          continue
        }

        // Insert the record
        const { error } = await supabaseClient
          .from(supabaseTable)
          .insert(transformedRecord)

        if (error) {
          console.error(`Error inserting record:`, error)
          result.errors.push(`${checkValue}: ${error.message}`)
        } else {
          result.migrated++
          console.log(`Migrated record ${checkValue}`)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`Error processing record:`, errorMsg)
        result.errors.push(errorMsg)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: `Migration completed: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors.length} errors`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function transformFirebaseRecord(record: any, collection: string): any {
  // Store Firebase ID for tracking
  const baseRecord = {
    firebase_id: record.id,
    migrated_from_firebase: true,
    migration_date: new Date().toISOString()
  }

  switch (collection) {
    case 'reports':
    case 'store_reports':
      return {
        ...baseRecord,
        date: record.date || record.created_at,
        coffee_type: record.coffee_type || record.type || 'Unknown',
        kilograms_bought: record.kilograms_bought || record.quantity_kg || 0,
        average_buying_price: record.average_buying_price || record.unit_price || 0,
        kilograms_sold: record.kilograms_sold || record.sales_quantity_kg || 0,
        bags_sold: record.bags_sold || 0,
        sold_to: record.sold_to || record.customer_name,
        bags_left: record.bags_left || 0,
        kilograms_left: record.kilograms_left || record.closing_stock || 0,
        kilograms_unbought: record.kilograms_unbought || 0,
        advances_given: record.advances_given || 0,
        comments: record.comments || record.notes,
        input_by: record.input_by || record.created_by || 'System',
        attachment_url: record.attachment_url || record.pdf_url,
        attachment_name: record.attachment_name || record.pdf_name,
        delivery_note_url: record.delivery_note_url,
        delivery_note_name: record.delivery_note_name,
        dispatch_report_url: record.dispatch_report_url,
        dispatch_report_name: record.dispatch_report_name,
        created_at: record.created_at || new Date().toISOString(),
        updated_at: record.updated_at || new Date().toISOString()
      }

    case 'coffee_records':
      return {
        ...baseRecord,
        id: record.id,
        date: record.date,
        batch_number: record.batch_number || record.batchNumber,
        supplier_name: record.supplier_name || record.supplierName,
        supplier_id: record.supplier_id || record.supplierId,
        coffee_type: record.coffee_type || record.coffeeType,
        bags: record.bags || 0,
        kilograms: record.kilograms || record.kgs || 0,
        status: record.status || 'pending',
        created_by: record.created_by || record.createdBy || 'System',
        created_at: record.created_at || record.createdAt || new Date().toISOString(),
        updated_at: record.updated_at || record.updatedAt || new Date().toISOString()
      }

    case 'payment_records':
      return {
        ...baseRecord,
        supplier_name: record.supplier_name || record.supplierName,
        payment_date: record.payment_date || record.date,
        amount: record.amount || 0,
        payment_method: record.payment_method || record.paymentMethod || 'cash',
        reference: record.reference || record.ref,
        notes: record.notes,
        recorded_by: record.recorded_by || record.recordedBy || 'System',
        created_at: record.created_at || record.createdAt || new Date().toISOString()
      }

    case 'supplier_advances':
      return {
        ...baseRecord,
        supplier_name: record.supplier_name || record.supplierName,
        supplier_id: record.supplier_id || record.supplierId,
        advance_date: record.advance_date || record.date,
        amount_ugx: record.amount_ugx || record.amount || 0,
        recovered_ugx: record.recovered_ugx || 0,
        balance_ugx: record.balance_ugx || record.balance || record.amount_ugx || record.amount || 0,
        status: record.status || 'active',
        notes: record.notes,
        given_by: record.given_by || record.givenBy || 'System',
        created_at: record.created_at || record.createdAt || new Date().toISOString(),
        updated_at: record.updated_at || record.updatedAt || new Date().toISOString()
      }

    case 'daily_tasks':
      return {
        ...baseRecord,
        date: record.date || new Date().toISOString().split('T')[0],
        task_type: record.task_type || record.taskType || 'general',
        description: record.description || '',
        department: record.department || 'General',
        completed_by: record.completed_by || record.completedBy || 'System',
        completed_at: record.completed_at || record.completedAt || new Date().toISOString(),
        amount: record.amount,
        batch_number: record.batch_number || record.batchNumber,
        created_at: record.created_at || record.createdAt || new Date().toISOString()
      }

    default:
      // Return the record as-is with base fields
      return {
        ...baseRecord,
        ...record,
        created_at: record.created_at || record.createdAt || new Date().toISOString(),
        updated_at: record.updated_at || record.updatedAt || new Date().toISOString()
      }
  }
}