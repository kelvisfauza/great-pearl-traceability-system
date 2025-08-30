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
    
    const today = new Date() // Add today back for date calculations

    // Process ALL days including weekends - no more Sunday exclusion
    
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

    // First, check for and backfill any missing days from this month (INCLUDING weekends)
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const allDaysThisMonth = getAllDaysForMonth(currentYear, currentMonth, today)
    
    console.log(`Checking for missing days in ${currentMonth + 1}/${currentYear}. Found ${allDaysThisMonth.length} total days (including weekends) to check.`)

    let totalProcessedCount = 0
    const todayDate = today.toISOString().split('T')[0]

    // Process ALL days (including weekends) up to today
    for (const dayDate of allDaysThisMonth) {
      const dateStr = dayDate.toISOString().split('T')[0]
      console.log(`Processing credits for ${dateStr}`)
      
      for (const employee of employees) {
        try {
          // Calculate daily credit using database function (monthly salary / days in month)
          const { data: dailyCreditResult } = await supabase.rpc('calculate_daily_salary_credit', {
            employee_salary: employee.salary
          })
          
          let dailyCredit = dailyCreditResult || Math.round((employee.salary / 31) * 100) / 100 // fallback

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

          // CRITICAL: Check current month total to prevent exceeding monthly salary
          const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01T00:00:00Z`
          const { data: monthlyEntries } = await supabase
            .from('ledger_entries')
            .select('amount')
            .eq('user_id', employee.auth_user_id)
            .eq('entry_type', 'DAILY_SALARY')
            .gte('created_at', monthStart)
            .lt('created_at', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01T00:00:00Z`)

          const currentMonthTotal = monthlyEntries?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0
          const remainingAllowance = employee.salary - currentMonthTotal

          // If already at or above monthly salary, skip
          if (remainingAllowance <= 0) {
            console.log(`${employee.name} already reached monthly salary (${currentMonthTotal}/${employee.salary}). Skipping ${dateStr}`)
            continue
          }

          // Cap the daily credit to not exceed monthly salary
          if (dailyCredit > remainingAllowance) {
            dailyCredit = remainingAllowance
            console.log(`Capped daily credit for ${employee.name} on ${dateStr}: ${dailyCredit} (remaining: ${remainingAllowance})`)
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
        message: `Salary credits processed successfully (including backfill for ${allDaysThisMonth.length} total days including weekends)`,
        date: todayDate,
        processed_count: totalProcessedCount,
        total_employees: employees.length,
        total_days_processed: allDaysThisMonth.length
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

function getAllDaysForMonth(year: number, month: number, upToDate: Date): Date[] {
  const allDays: Date[] = []
  
  // Get the first day of the month
  const firstDay = new Date(year, month, 1)
  
  // Only go up to upToDate (today) if we're in the current month
  const endDate = upToDate

  // Loop through ALL days of the month up to today (including weekends)
  for (let day = new Date(firstDay); day <= endDate; day.setDate(day.getDate() + 1)) {
    // Include ALL days - no exclusions for weekends
    allDays.push(new Date(day)) // Create a new Date object to avoid reference issues
  }

  return allDays
}