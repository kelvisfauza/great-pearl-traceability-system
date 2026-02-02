import { getVerificationQRUrl, getVerificationUrl } from '@/utils/verificationCode';

/**
 * Generates a standard print footer HTML with verification QR code
 */
export function getStandardPrintFooter(verificationCode?: string): string {
  const currentYear = new Date().getFullYear();
  
  let verificationSection = '';
  if (verificationCode) {
    const qrUrl = getVerificationQRUrl(verificationCode, 100);
    const verifyUrl = getVerificationUrl(verificationCode);
    
    verificationSection = `
      <div class="verification-section" style="text-align: center; margin: 20px 0; padding: 15px; border: 1px dashed #ccc; background: #fafafa; border-radius: 4px;">
        <p style="font-size: 10px; color: #666; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">
          Document Verification
        </p>
        <div style="display: inline-block; border: 1px solid #ddd; padding: 8px; background: white; border-radius: 4px;">
          <img 
            src="${qrUrl}" 
            alt="Verification QR Code"
            style="width: 100px; height: 100px; display: block;"
          />
        </div>
        <p style="font-size: 11px; color: #0d3d1f; margin-top: 8px; font-family: monospace; letter-spacing: 1px; font-weight: bold;">
          ${verificationCode}
        </p>
        <p style="font-size: 9px; color: #999; margin-top: 4px;">
          Scan QR code or visit: ${verifyUrl}
        </p>
      </div>
    `;
  }

  return `
    ${verificationSection}
    <div class="print-footer" style="text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px;">
      <p style="margin: 0;">Great Pearl Coffee Factory Ltd.</p>
      <p style="margin: 2px 0;">Delivering coffee from the heart of Rwenzori</p>
      <p style="margin: 2px 0;">+256781121639 / +256778536681 | www.greatpearlcoffee.com</p>
      <p style="margin: 5px 0 0; font-size: 8px; color: #999;">© ${currentYear} Great Pearl Coffee Factory. All rights reserved.</p>
    </div>
  `;
}

/**
 * Gets CSS styles for verification elements in print
 */
export function getVerificationPrintStyles(): string {
  return `
    .verification-section {
      text-align: center;
      margin: 20px 0;
      padding: 15px;
      border: 1px dashed #ccc;
      background: #fafafa;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    
    .verification-section img {
      width: 100px !important;
      height: 100px !important;
      max-width: 100px !important;
      display: block;
      margin: 0 auto;
    }
    
    .verification-code {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: bold;
      color: #0d3d1f;
      letter-spacing: 1px;
    }
    
    @media print {
      .verification-section {
        border: 1px dashed #999;
        background: #fff;
      }
    }
  `;
}
