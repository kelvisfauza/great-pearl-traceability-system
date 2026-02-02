import React from 'react';
import { getVerificationQRUrl, getVerificationUrl } from '@/utils/verificationCode';

interface VerificationQRCodeProps {
  code: string;
  size?: number;
  showUrl?: boolean;
  className?: string;
}

/**
 * QR Code component for document verification
 * Renders a QR code that links to the verification page
 */
const VerificationQRCode: React.FC<VerificationQRCodeProps> = ({
  code,
  size = 100,
  showUrl = true,
  className = '',
}) => {
  const qrUrl = getVerificationQRUrl(code, size);
  const verifyUrl = getVerificationUrl(code);

  return (
    <div className={`verification-qr text-center ${className}`}>
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '8px', 
        display: 'inline-block',
        backgroundColor: 'white',
        borderRadius: '4px'
      }}>
        <img 
          src={qrUrl} 
          alt={`Verification QR Code: ${code}`}
          style={{ width: size, height: size, display: 'block' }}
        />
      </div>
      <p style={{ 
        fontSize: '9px', 
        color: '#666', 
        marginTop: '4px',
        fontFamily: 'monospace'
      }}>
        {code}
      </p>
      {showUrl && (
        <p style={{ 
          fontSize: '8px', 
          color: '#999', 
          marginTop: '2px',
          wordBreak: 'break-all'
        }}>
          Scan to verify or visit: {verifyUrl}
        </p>
      )}
    </div>
  );
};

export default VerificationQRCode;

/**
 * Generates HTML string for QR code (for use in printWindow.document.write)
 */
export function getVerificationQRHtml(code: string, size: number = 100): string {
  const qrUrl = getVerificationQRUrl(code, size);
  const verifyUrl = getVerificationUrl(code);

  return `
    <div class="verification-qr" style="text-align: center; margin-top: 20px; padding: 15px; border-top: 1px dashed #ccc;">
      <p style="font-size: 10px; color: #666; margin-bottom: 8px; font-weight: bold;">
        DOCUMENT VERIFICATION
      </p>
      <div style="border: 1px solid #ddd; padding: 8px; display: inline-block; background: white; border-radius: 4px;">
        <img 
          src="${qrUrl}" 
          alt="Verification QR Code"
          style="width: ${size}px; height: ${size}px; display: block;"
        />
      </div>
      <p style="font-size: 10px; color: #333; margin-top: 8px; font-family: monospace; letter-spacing: 1px;">
        ${code}
      </p>
      <p style="font-size: 8px; color: #999; margin-top: 4px;">
        Scan QR code or visit: ${verifyUrl}
      </p>
    </div>
  `;
}
