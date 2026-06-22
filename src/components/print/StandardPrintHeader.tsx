import React from 'react';
import { getVerificationQRUrl } from '@/utils/verificationCode';
import { LOGO_URL, COMPANY_NAME, COMPANY_TAGLINE, COMPANY_REG } from '@/utils/companyBrand';

interface StandardPrintHeaderProps {
  title: string;
  subtitle?: string;
  documentNumber?: string;
  includeDate?: boolean;
  additionalInfo?: string;
  verificationCode?: string;
}

const StandardPrintHeader: React.FC<StandardPrintHeaderProps> = ({
  title,
  subtitle,
  documentNumber,
  includeDate = true,
  additionalInfo,
  verificationCode,
}) => {
  return (
    <div className="print-header border-b-2 border-gray-800 pb-4 mb-6">
      {/* Letterhead: logo on the left, company name + tagline beside it */}
      <div className="flex items-center gap-4 mb-2">
        <div
          className="flex items-center justify-center"
          style={{ backgroundColor: '#0d3d1f', padding: '10px', borderRadius: '6px' }}
        >
          <img
            src={LOGO_URL}
            alt="Great Agro Coffee Logo"
            className="company-logo h-16 w-auto"
          />
        </div>
        <div>
          <h1 className="company-name font-bold text-xl uppercase tracking-wide text-gray-900">
            {COMPANY_NAME}
          </h1>
          <p className="text-sm font-semibold italic text-gray-700">
            {COMPANY_TAGLINE}
          </p>
        </div>
      </div>

      {/* Registration line only (no incorporation date in the header) */}
      <p className="text-sm text-gray-600 mb-4">{COMPANY_REG}</p>

      {/* Document Title - Centered */}
      <h2 className="document-title text-lg font-bold uppercase tracking-wide text-gray-900 mb-2 text-center">
        {title}
      </h2>

      {/* Subtitle - Centered */}
      {subtitle && (
        <p className="text-sm text-gray-600 mb-2 text-center">{subtitle}</p>
      )}

      {/* Document Number and Date - Centered */}
      <div className="document-info text-sm text-gray-600 space-y-1 text-center">
        {documentNumber && (
          <p>Document Number: {documentNumber}</p>
        )}
        {includeDate && (
          <p>Date: {new Date().toLocaleDateString('en-GB')}</p>
        )}
        {additionalInfo && (
          <p>{additionalInfo}</p>
        )}
      </div>

      {/* Verification QR Code */}
      {verificationCode && (
        <div className="verification-section mt-4 pt-3 border-t border-dashed border-gray-400">
          <div className="flex items-center justify-center gap-4">
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase font-semibold">Document Verification</p>
              <p className="text-sm font-mono font-bold text-green-700">{verificationCode}</p>
              <p className="text-xs text-gray-400">Scan QR to verify authenticity</p>
            </div>
            <div className="border border-gray-300 p-1 bg-white rounded">
              <img
                src={getVerificationQRUrl(verificationCode, 80)}
                alt="Verification QR Code"
                className="w-20 h-20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardPrintHeader;
