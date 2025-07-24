import React from 'react';
import { Button } from '@/components/ui/button';
import { X, MessageSquare } from 'lucide-react';

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagingPanel = ({ isOpen, onClose }: MessagingPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed right-4 bottom-20 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[400px] h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Messages</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Coming Soon Content */}
      <div className="flex flex-col items-center justify-center h-[calc(300px-73px)] text-center p-6">
        <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Coming Soon</h3>
        <p className="text-gray-500 text-sm">
          Messaging functionality will be available in a future update.
        </p>
      </div>
    </div>
  );
};

export default MessagingPanel;