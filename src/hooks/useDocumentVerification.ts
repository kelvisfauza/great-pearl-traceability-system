import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateVerificationCode } from '@/utils/verificationCode';
import { useToast } from '@/hooks/use-toast';

type DocumentType = 'document' | 'employee_id' | 'receipt' | 'report' | 'contract' | 'assessment' | 'grn';

interface VerificationData {
  type: DocumentType;
  subtype: string;
  issued_to_name: string;
  employee_no?: string;
  department?: string;
  position?: string;
  reference_no?: string;
  issued_by?: string;
  valid_until?: string;
  meta?: Record<string, unknown>;
}

interface Verification {
  id: string;
  code: string;
  type: string;
  subtype: string;
  status: string;
  issued_to_name: string;
  employee_no?: string;
  position?: string;
  department?: string;
  workstation?: string;
  photo_url?: string;
  issued_at: string;
  valid_until?: string;
  reference_no?: string;
  file_url?: string;
  meta?: Record<string, unknown>;
  created_at?: string;
}

export function useDocumentVerification() {
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  /**
   * Creates a new verification record and returns the verification code
   */
  const createVerification = async (data: VerificationData): Promise<string | null> => {
    setIsCreating(true);
    try {
      const code = generateVerificationCode(data.type);
      
      // Get current user for RLS policy compliance
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('verifications')
        .insert([{
          code,
          type: data.type,
          subtype: data.subtype,
          status: 'verified',
          issued_to_name: data.issued_to_name,
          employee_no: data.employee_no,
          department: data.department,
          position: data.position,
          reference_no: data.reference_no,
          issued_at: new Date().toISOString(),
          valid_until: data.valid_until,
          meta: (data.meta || {}) as unknown as Record<string, never>,
          created_by: user?.id,
        }]);

      if (error) {
        console.error('Error creating verification:', error);
        toast({
          title: 'Verification Error',
          description: 'Failed to create verification record',
          variant: 'destructive',
        });
        return null;
      }

      return code;
    } catch (error) {
      console.error('Error creating verification:', error);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Verifies a document by code
   */
  const verifyDocument = async (code: string): Promise<Verification | null> => {
    setIsVerifying(true);
    try {
      // Fetch the verification
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Verification;
    } catch (error) {
      console.error('Error verifying document:', error);
      return null;
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Revokes a verification
   */
  const revokeVerification = async (code: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('verifications')
        .update({
          status: 'revoked',
          revoked_reason: reason,
        })
        .eq('code', code);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to revoke verification',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Success',
        description: 'Verification has been revoked',
      });
      return true;
    } catch (error) {
      console.error('Error revoking verification:', error);
      return false;
    }
  };

  return {
    createVerification,
    verifyDocument,
    revokeVerification,
    isCreating,
    isVerifying,
  };
}
