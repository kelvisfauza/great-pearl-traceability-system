import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    const { month, year } = body

    // Use current month/year if not provided
    const today = new Date()
    const targetMonth = month || (today.getMonth() + 1) // getMonth() is 0-based
    const targetYear = year || today.getFullYear()

    console.log(`Backfilling salary credits for ${targetMonth}/${targetYear}`)

    // Get all working days for the month (excluding Sundays)
    const workingDays = getWorkingDaysForMonth(targetYear, targetMonth - 1) // Date constructor uses 0-based months
    console.log(`Found ${workingDays.length} working days:`, workingDays.map(d => d.toISOString().split('T')[0]))

    // Get all active employees with salaries
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, auth_user_id, name, salary, email')
      .eq('status', 'Active')
      .gt('salary', 0)
      .not('auth_user_id', 'is', null)

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      throw employeesError
    }

    if (!employees || employees.length === 0) {
      console.log('No active employees found with salaries')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active employees found with salaries',
          processed_count: 0,
          working_days: workingDays.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Processing backfill for ${employees.length} employees across ${workingDays.length} working days`)

    let totalProcessed = 0
    const results: any[] = []

    // Process each working day
    for (const workingDay of workingDays) {
      const dateStr = workingDay.toISOString().split('T')[0]
      let dayProcessedCount = 0

      console.log(`Processing credits for ${dateStr}`)

      for (const employee of employees) {
        try {
          // Calculate daily credit (monthly salary / 26 working days)
          const dailyCredit = Math.round((employee.salary / 26) * 100) / 100

          // Check if credit already exists for this day
          const { data: existingEntry } = await supabase
            .from('ledger_entries')
            .select('id')
            .eq('user_id', employee.auth_user_id)
            .eq('entry_type', 'DAILY_SALARY')
            .gte('created_at', `${dateStr}T00:00:00`)
            .lt('created_at', `${dateStr}T23:59:59`)
            .single()

          if (existingEntry) {
            console.log(`Credit already exists for ${employee.name} on ${dateStr}`)
            continue
          }

          // Add daily salary credit to ledger
          const { error: insertError } = await supabase
            .from('ledger_entries')
            .insert({
              user_id: employee.auth_user_id,
              entry_type: 'DAILY_SALARY',
              amount: dailyCredit,
              reference: `BACKFILL-${dateStr}-${employee.id}`,
              metadata: {
                employee_id: employee.id,
                employee_name: employee.name,
                monthly_salary: employee.salary,
                credit_date: dateStr,
                backfill: true
              },
              created_at: `${dateStr}T08:00:00Z` // Credit at 8 AM
            })

          if (insertError) {
            console.error(`Error inserting backfill credit for ${employee.name} on ${dateStr}:`, insertError)
            continue
          }

          console.log(`Backfilled ${dailyCredit} for ${employee.name} on ${dateStr}`)
          dayProcessedCount++
          totalProcessed++

        } catch (empError) {
          console.error(`Error processing employee ${employee.name} for ${dateStr}:`, empError)
          continue
        }
      }

      results.push({
        date: dateStr,
        processed_count: dayProcessedCount,
        total_employees: employees.length
      })
    }

    console.log(`Backfill completed. Total credits processed: ${totalProcessed}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill completed for ${targetMonth}/${targetYear}`,
        month: targetMonth,
        year: targetYear,
        working_days: workingDays.length,
        total_employees: employees.length,
        total_processed: totalProcessed,
        daily_results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in backfill-salary-credits function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error backfilling salary credits: ${error.message}`,
        processed_count: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function getWorkingDaysForMonth(year: number, month: number): Date[] {
  const workingDays: Date[] = []
  const today = new Date()
  
  // Get the first day of the month and last day
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0) // Last day of the month
  
  // Only go up to today if we're in the current month
  const endDate = (year === today.getFullYear() && month === today.getMonth()) 
    ? today 
    : lastDay

  // Loop through all days of the month up to today (or end of month if past month)
  for (let day = new Date(firstDay); day <= endDate; day.setDate(day.getDate() + 1)) {
    const dayOfWeek = day.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Include all days except Sunday (0)
    if (dayOfWeek !== 0) {
      workingDays.push(new Date(day)) // Create a new Date object to avoid reference issues
    }
  }

  return workingDays
}