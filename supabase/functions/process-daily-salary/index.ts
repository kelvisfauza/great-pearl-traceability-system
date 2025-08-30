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

    const today = new Date()
    const isSunday = today.getDay() === 0 // 0 = Sunday
    
    // Don't process on Sundays
    if (isSunday) {
      console.log('Skipping salary processing - today is Sunday')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No salary credits processed on Sunday',
          date: today.toISOString().split('T')[0],
          processed_count: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

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
          date: today.toISOString().split('T')[0],
          processed_count: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Processing daily salary credits for ${employees.length} employees`)

    // First, check for and backfill any missing days from this month
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const workingDaysThisMonth = getWorkingDaysForMonth(currentYear, currentMonth, today)
    
    console.log(`Checking for missing days in ${currentMonth + 1}/${currentYear}. Found ${workingDaysThisMonth.length} working days to check.`)

    let totalProcessedCount = 0
    const todayDate = today.toISOString().split('T')[0]

    // Process all working days up to today (backfill + today)
    for (const workingDay of workingDaysThisMonth) {
      const dateStr = workingDay.toISOString().split('T')[0]
      console.log(`Processing credits for ${dateStr}`)
      
      for (const employee of employees) {
        try {
          // Calculate daily credit (monthly salary / 26 working days)
          const dailyCredit = Math.round((employee.salary / 26) * 100) / 100

          // Check if credit already exists for this date
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

          // Determine if this is a backfill (past date) or current day
          const isBackfill = dateStr !== todayDate
          const reference = isBackfill ? `BACKFILL-${dateStr}-${employee.id}` : `DAILY-${dateStr}-${employee.id}`

          // Add daily salary credit to ledger
          const { error: insertError } = await supabase
            .from('ledger_entries')
            .insert({
              user_id: employee.auth_user_id,
              entry_type: 'DAILY_SALARY',
              amount: dailyCredit,
              reference: reference,
              metadata: {
                employee_id: employee.id,
                employee_name: employee.name,
                monthly_salary: employee.salary,
                credit_date: dateStr,
                backfill: isBackfill
              },
              created_at: `${dateStr}T08:00:00Z` // Credit at 8 AM
            })

          if (insertError) {
            console.error(`Error inserting credit for ${employee.name} on ${dateStr}:`, insertError)
            continue
          }

          const actionType = isBackfill ? 'Backfilled' : 'Added daily credit of'
          console.log(`${actionType} ${dailyCredit} for ${employee.name} on ${dateStr}`)
          totalProcessedCount++

        } catch (empError) {
          console.error(`Error processing employee ${employee.name} on ${dateStr}:`, empError)
          continue
        }
      }
    }

    console.log(`Successfully processed ${totalProcessedCount} salary credits (including backfill)`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Salary credits processed successfully (including backfill for ${workingDaysThisMonth.length} working days)`,
        date: todayDate,
        processed_count: totalProcessedCount,
        total_employees: employees.length,
        working_days_processed: workingDaysThisMonth.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in process-daily-salary function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error processing daily salary credits: ${error.message}`,
        date: new Date().toISOString().split('T')[0],
        processed_count: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function getWorkingDaysForMonth(year: number, month: number, upToDate: Date): Date[] {
  const workingDays: Date[] = []
  
  // Get the first day of the month
  const firstDay = new Date(year, month, 1)
  
  // Only go up to upToDate (today) if we're in the current month
  const endDate = upToDate

  // Loop through all days of the month up to today
  for (let day = new Date(firstDay); day <= endDate; day.setDate(day.getDate() + 1)) {
    const dayOfWeek = day.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Include all days except Sunday (0)
    if (dayOfWeek !== 0) {
      workingDays.push(new Date(day)) // Create a new Date object to avoid reference issues
    }
  }

  return workingDays
}