import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { RingtoneManager } from '@/utils/WebRTCManager';

interface CallData {
  id: string;
  caller_id: string;
  caller_name: string;
  recipient_id: string;
  recipient_name: string;
  status: string;
  started_at: string;
}

interface IncomingCallModalProps {
  isOpen: boolean;
  callData: CallData | null;
  onAnswer: () => void;
  onDecline: () => void;
}

const IncomingCallModal = ({ isOpen, callData, onAnswer, onDecline }: IncomingCallModalProps) => {
  const ringtoneManager = useRef<RingtoneManager | null>(null);

  useEffect(() => {
    if (!ringtoneManager.current) {
      ringtoneManager.current = new RingtoneManager();
    }

    if (isOpen && callData) {
      ringtoneManager.current.startRinging();
    } else {
      ringtoneManager.current?.stopRinging();
    }

    return () => {
      ringtoneManager.current?.stopRinging();
    };
  }, [isOpen, callData]);

  if (!callData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden z-50">
        <DialogHeader>
          <DialogTitle className="text-center">Incoming Call</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Caller Avatar with animation */}
          <div className="relative">
            <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold animate-pulse">
              {callData.caller_name.substring(0, 2).toUpperCase()}
            </div>
            {/* Animated ring */}
            <div className="absolute inset-0 w-32 h-32 border-4 border-blue-400 rounded-full animate-ping"></div>
            <div className="absolute inset-2 w-28 h-28 border-2 border-blue-300 rounded-full animate-ping animation-delay-200"></div>
          </div>

          {/* Caller Info */}
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              {callData.caller_name}
            </h3>
            <p className="text-lg text-gray-600">is calling you...</p>
          </div>

          {/* Call Actions */}
          <div className="flex items-center space-x-8">
            {/* Decline Button */}
            <Button
              variant="destructive"
              size="lg"
              onClick={onDecline}
              className="w-16 h-16 rounded-full p-0 bg-red-500 hover:bg-red-600 shadow-lg"
            >
              <PhoneOff className="h-8 w-8" />
            </Button>

            {/* Answer Button */}
            <Button
              variant="default"
              size="lg"
              onClick={onAnswer}
              className="w-16 h-16 rounded-full p-0 bg-green-500 hover:bg-green-600 shadow-lg animate-pulse"
            >
              <Phone className="h-8 w-8" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-500">
            <p>Tap to answer or decline the call</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;