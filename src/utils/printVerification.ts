import { generateVerificationCode, getVerificationQRUrl } from './verificationCode';
import { supabase } from '@/integrations/supabase/client';

export interface PrintVerificationOptions {
  type: 'report' | 'document' | 'receipt' | 'grn' | 'assessment' | 'employee_id';
  subtype: string;
  issued_to_name?: string;
  reference_no?: string;
  meta?: Record<string, any>;
}

export const createPrintVerification = async (options: PrintVerificationOptions): Promise<{
  code: string;
  qrUrl: string;
}> => {
  const code = generateVerificationCode('report');
  const qrUrl = getVerificationQRUrl(code);

  try {
    // Get current user for RLS policy compliance
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('verifications').insert({
      code,
      type: options.type,
      subtype: options.subtype,
      status: 'verified',
      issued_to_name: options.issued_to_name || 'System Generated',
      issued_at: new Date().toISOString(),
      reference_no: options.reference_no,
      meta: options.meta || {},
      created_by: user?.id
    });
  } catch (error) {
    console.error('Error creating verification record:', error);
  }

  return { code, qrUrl };
};

export const getVerificationHtml = (code: string, qrUrl: string): string => {
  const verifyUrl = `${window.location.origin}/verify/${code}`;
  
  return `
    <div class="verification-section" style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #999;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
        <div style="text-align: center;">
          <img src="${qrUrl}" alt="Verification QR Code" style="width: 80px; height: 80px;" />
          <p style="font-size: 10px; margin: 5px 0 0 0; color: #666;">Scan to verify</p>
        </div>
        <div style="text-align: left; font-size: 11px;">
          <p style="margin: 0; font-weight: bold;">Document Verification</p>
          <p style="margin: 3px 0; color: #666;">Code: <strong>${code}</strong></p>
          <p style="margin: 3px 0; color: #666;">Verify at: <a href="${verifyUrl}" style="color: #0066cc;">${window.location.origin}/verify</a></p>
        </div>
      </div>
    </div>
  `;
};

export const getVerificationStyles = (): string => {
  return `
    .verification-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px dashed #999;
      page-break-inside: avoid;
    }
    .verification-section img {
      max-width: 80px;
      height: auto;
    }
  `;
};
