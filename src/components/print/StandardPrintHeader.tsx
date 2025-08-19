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
    <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
      {/* Logo */}
      <div className="mb-4">
        <img 
          src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
          alt="Great Pearl Coffee Factory Logo" 
          className="mx-auto h-16 w-auto mb-2" 
        />
      </div>
      
      {/* Company Name */}
      <h1 className="font-bold text-xl uppercase tracking-wide mb-2 text-gray-900">
        GREAT PEARL COFFEE FACTORY
      </h1>
      
      {/* Company Contact Info */}
      <div className="text-sm text-gray-600 space-y-1 mb-4">
        <p>Specialty Coffee Processing & Export</p>
        <p>+256781121639 / +256778536681</p>
        <p>www.greatpearlcoffee.com | greatpearlcoffee@gmail.com</p>
        <p>Uganda Coffee Development Authority Licensed</p>
      </div>
      
      {/* Document Title */}
      <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900 mb-2">
        {title}
      </h2>
      
      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-gray-600 mb-2">{subtitle}</p>
      )}
      
      {/* Document Number and Date */}
      <div className="text-sm text-gray-600 space-y-1">
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