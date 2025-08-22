import React from 'react';

interface StandardPrintHeaderProps {
  title: string;
  subtitle?: string;
  documentNumber?: string;
  includeDate?: boolean;
  additionalInfo?: string;
}

const StandardPrintHeader: React.FC<StandardPrintHeaderProps> = ({
  title,
  subtitle,
  documentNumber,
  includeDate = true,
  additionalInfo
}) => {
  return (
    <div className="print-header text-center border-b-2 border-gray-800 pb-4 mb-6">
      {/* Logo - Centered */}
      <div className="flex justify-center mb-4">
        <img 
          src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
          alt="Great Pearl Coffee Factory Logo" 
          className="company-logo h-16 w-auto mb-2" 
        />
      </div>
      
      {/* Company Name - Centered */}
      <h1 className="company-name font-bold text-xl uppercase tracking-wide mb-2 text-gray-900 text-center">
        GREAT PEARL COFFEE FACTORY
      </h1>
      
      {/* Company Contact Info - Centered */}
      <div className="company-details text-sm text-gray-600 space-y-1 mb-4 text-center">
        <p>Specialty Coffee Processing & Export</p>
        <p>+256781121639 / +256778536681</p>
        <p>www.greatpearlcoffee.com | greatpearlcoffee@gmail.com</p>
        <p>Uganda Coffee Development Authority Licensed</p>
      </div>
      
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
    </div>
  );
};

export default StandardPrintHeader;