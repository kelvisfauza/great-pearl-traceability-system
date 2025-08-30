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

    let processedCount = 0
    const todayDate = today.toISOString().split('T')[0]

    for (const employee of employees) {
      try {
        // Calculate daily credit (monthly salary / 26 working days)
        const dailyCredit = Math.round((employee.salary / 26) * 100) / 100

        // Check if credit already exists for today
        const { data: existingEntry } = await supabase
          .from('ledger_entries')
          .select('id')
          .eq('user_id', employee.auth_user_id)
          .eq('entry_type', 'DAILY_SALARY')
          .gte('created_at', `${todayDate}T00:00:00`)
          .lt('created_at', `${todayDate}T23:59:59`)
          .single()

        if (existingEntry) {
          console.log(`Daily credit already exists for employee ${employee.name}`)
          continue
        }

        // Add daily salary credit to ledger
        const { error: insertError } = await supabase
          .from('ledger_entries')
          .insert({
            user_id: employee.auth_user_id,
            entry_type: 'DAILY_SALARY',
            amount: dailyCredit,
            reference: `DAILY-${todayDate}-${employee.id}`,
            metadata: {
              employee_id: employee.id,
              employee_name: employee.name,
              monthly_salary: employee.salary,
              credit_date: todayDate
            },
            created_at: `${todayDate}T08:00:00Z` // Credit at 8 AM
          })

        if (insertError) {
          console.error(`Error inserting daily credit for ${employee.name}:`, insertError)
          continue
        }

        console.log(`Added daily credit of ${dailyCredit} for ${employee.name}`)
        processedCount++

      } catch (empError) {
        console.error(`Error processing employee ${employee.name}:`, empError)
        continue
      }
    }

    console.log(`Successfully processed ${processedCount} daily salary credits`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily salary credits processed successfully',
        date: todayDate,
        processed_count: processedCount,
        total_employees: employees.length
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