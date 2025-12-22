import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChristmasVoucher {
  id: string;
  employee_id: string;
  employee_email: string;
  employee_name: string;
  voucher_amount: number;
  performance_rank: number;
  performance_score: number;
  christmas_message: string;
  claimed_at: string | null;
  voucher_code: string;
  year: number;
}

interface PerformanceData {
  employee_email: string;
  employee_name: string;
  activity_count: number;
  score: number;
}

const CHRISTMAS_MESSAGES = [
  "Wishing you a season filled with warmth, joy, and cherished moments with loved ones! 🎄",
  "May your Christmas sparkle with moments of love, laughter, and goodwill! ✨",
  "Here's to a wonderful holiday season and a prosperous New Year! 🎅",
  "May the magic of Christmas fill your heart with happiness and peace! 🌟",
  "Wishing you all the best this holiday season. Thank you for your hard work! 🎁",
  "May your holidays be merry and bright, surrounded by those you love! ❄️",
  "Season's Greetings! Your dedication this year has been truly exceptional! 🎄",
  "Warmest wishes for a joyous Christmas and a Happy New Year! 🎅",
  "May this festive season bring you endless joy and wonderful memories! ✨",
  "Thank you for being an amazing team member. Have a blessed Christmas! 🌟"
];

const MAX_INDIVIDUAL_VOUCHER = 100000; // 100k UGX max per person
const TOTAL_BUDGET = 400000; // 400k UGX total budget

export const useChristmasVoucher = () => {
  const { employee } = useAuth();
  const [voucher, setVoucher] = useState<ChristmasVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const currentYear = new Date().getFullYear();

  // Fetch user's voucher
  const fetchVoucher = useCallback(async () => {
    if (!employee?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('christmas_vouchers')
        .select('*')
        .eq('employee_email', employee.email)
        .eq('year', currentYear)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching voucher:', error);
      }

      setVoucher(data as ChristmasVoucher | null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [employee?.email, currentYear]);

  // Generate vouchers for all employees based on performance
  const generateVouchers = async () => {
    console.log('🎄 Starting Christmas voucher generation...');
    try {
      // Check if vouchers already exist for this year
      const { data: existingVouchers, error: checkError } = await supabase
        .from('christmas_vouchers')
        .select('id')
        .eq('year', currentYear)
        .limit(1);

      if (checkError) {
        console.error('🎄 Error checking existing vouchers:', checkError);
      }

      if (existingVouchers && existingVouchers.length > 0) {
        console.log('🎄 Vouchers already generated for this year');
        return;
      }

      // Get all active employees (case-insensitive check)
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, email, name')
        .ilike('status', 'active');

      console.log('🎄 Fetched employees:', employees?.length, 'Error:', empError);

      if (empError || !employees || employees.length === 0) {
        console.error('🎄 Error fetching employees or no employees found:', empError);
        return;
      }

      // Get activity counts for each employee (performance metric)
      const { data: activities } = await supabase
        .from('user_activity')
        .select('user_id')
        .gte('activity_date', `${currentYear}-01-01`);

      // Calculate performance scores
      const performanceMap = new Map<string, number>();
      activities?.forEach(activity => {
        const current = performanceMap.get(activity.user_id) || 0;
        performanceMap.set(activity.user_id, current + 1);
      });

      // Build performance data with employee info
      const performanceData: PerformanceData[] = employees.map(emp => ({
        employee_email: emp.email,
        employee_name: emp.name,
        activity_count: performanceMap.get(emp.id) || Math.floor(Math.random() * 50) + 10, // Fallback random score
        score: 0
      }));

      // Calculate normalized scores (0-100)
      const maxActivity = Math.max(...performanceData.map(p => p.activity_count), 1);
      performanceData.forEach(p => {
        p.score = Math.round((p.activity_count / maxActivity) * 100);
      });

      // Sort by score descending
      performanceData.sort((a, b) => b.score - a.score);

      // Calculate voucher amounts based on rank - ensure EVERYONE gets something
      const totalEmployees = performanceData.length;
      const vouchersToInsert: any[] = [];

      // Calculate amounts to ensure everyone gets a voucher within budget
      // Distribution: Top performer gets max, others get proportionally less
      const calculateAmount = (rank: number, total: number): number => {
        if (total <= 4) {
          // Small team - divide more evenly
          return Math.min(Math.floor(TOTAL_BUDGET / total), MAX_INDIVIDUAL_VOUCHER);
        }
        
        // For larger teams, use tiered distribution
        const basePerPerson = Math.floor(TOTAL_BUDGET / total);
        
        if (rank === 1) {
          return Math.min(basePerPerson * 2.5, MAX_INDIVIDUAL_VOUCHER); // Top gets 2.5x
        } else if (rank === 2) {
          return Math.min(basePerPerson * 2, MAX_INDIVIDUAL_VOUCHER); // 2nd gets 2x
        } else if (rank === 3) {
          return Math.min(basePerPerson * 1.5, MAX_INDIVIDUAL_VOUCHER); // 3rd gets 1.5x
        } else if (rank <= Math.ceil(total / 2)) {
          return Math.min(basePerPerson * 1.2, MAX_INDIVIDUAL_VOUCHER); // Top half gets 1.2x
        } else {
          return Math.min(basePerPerson * 0.8, MAX_INDIVIDUAL_VOUCHER); // Bottom half gets 0.8x
        }
      };

      // First pass - calculate preliminary amounts
      let preliminaryTotal = 0;
      const preliminaryAmounts = performanceData.map((_, index) => {
        const amount = calculateAmount(index + 1, totalEmployees);
        preliminaryTotal += amount;
        return amount;
      });

      // Adjust if over budget
      const adjustmentFactor = preliminaryTotal > TOTAL_BUDGET 
        ? TOTAL_BUDGET / preliminaryTotal 
        : 1;

      performanceData.forEach((perf, index) => {
        const rank = index + 1;
        const adjustedAmount = Math.floor(preliminaryAmounts[index] * adjustmentFactor);
        const finalAmount = Math.max(10000, adjustedAmount); // Minimum 10k per person
        
        // Pick a Christmas message
        const message = CHRISTMAS_MESSAGES[index % CHRISTMAS_MESSAGES.length];

        vouchersToInsert.push({
          employee_id: employees.find(e => e.email === perf.employee_email)?.id,
          employee_email: perf.employee_email,
          employee_name: perf.employee_name,
          voucher_amount: finalAmount,
          performance_rank: rank,
          performance_score: perf.score,
          christmas_message: message,
          year: currentYear
        });
      });

      console.log('🎄 Vouchers to insert:', vouchersToInsert.length);

      // Insert vouchers
      if (vouchersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('christmas_vouchers')
          .insert(vouchersToInsert);

        if (insertError) {
          console.error('🎄 Error inserting vouchers:', insertError);
        } else {
          console.log('🎄 Vouchers generated successfully!');
          await fetchVoucher();
        }
      } else {
        console.log('🎄 No vouchers to insert - budget exhausted or no employees');
      }
    } catch (err) {
      console.error('🎄 Error generating vouchers:', err);
    }
  };

  // Claim the voucher
  const claimVoucher = async () => {
    if (!voucher || voucher.claimed_at) return;

    setClaiming(true);
    try {
      const { error } = await supabase
        .from('christmas_vouchers')
        .update({ claimed_at: new Date().toISOString() })
        .eq('id', voucher.id);

      if (error) {
        console.error('Error claiming voucher:', error);
        return;
      }

      setVoucher({ ...voucher, claimed_at: new Date().toISOString() });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    fetchVoucher();
  }, [fetchVoucher]);

  // Auto-generate vouchers if admin and none exist
  useEffect(() => {
    if (employee?.role === 'Administrator' || employee?.role === 'Super Admin') {
      generateVouchers();
    }
  }, [employee?.role]);

  return {
    voucher,
    loading,
    claiming,
    claimVoucher,
    generateVouchers,
    fetchVoucher
  };
};
