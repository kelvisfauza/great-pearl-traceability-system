import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  reason?: string;
  matchedRequest?: string;
}

export const useDuplicateExpenseCheck = () => {
  const [checking, setChecking] = useState(false);
  const { employee } = useAuth();

  const checkForDuplicate = async (
    type: string,
    title: string,
    description: string,
    amount: number
  ): Promise<DuplicateCheckResult> => {
    if (!employee?.email) {
      return { isDuplicate: false, confidence: 0 };
    }

    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-duplicate-expense', {
        body: {
          newRequest: { type, title, description, amount },
          userEmail: employee.email
        }
      });

      if (error) {
        console.error('Duplicate check error:', error);
        return { isDuplicate: false, confidence: 0 };
      }

      return data as DuplicateCheckResult;
    } catch (error) {
      console.error('Failed to check for duplicates:', error);
      return { isDuplicate: false, confidence: 0 };
    } finally {
      setChecking(false);
    }
  };

  return { checkForDuplicate, checking };
};
