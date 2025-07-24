import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WebRTCManager, RingtoneManager } from '@/utils/WebRTCManager';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCallButtonProps {
  selectedUser: any;
  currentUserId?: string;
  onCallStart?: () => void;
}

const VoiceCallButton = ({ selectedUser, currentUserId, onCallStart }: VoiceCallButtonProps) => {
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'unavailable'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const webRTCManager = useRef<WebRTCManager | null>(null);
  const ringtoneManager = useRef<RingtoneManager | null>(null);
  const { toast } = useToast();

  // Initialize managers
  useEffect(() => {
    ringtoneManager.current = new RingtoneManager();
    return () => {
      ringtoneManager.current?.cleanup();
    };
  }, []);

  // Timer for call duration - only count when connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = async () => {
    try {
      setCallState('ringing');
      ringtoneManager.current?.startRinging();
      
      console.log('Initiating call to:', selectedUser.displayName || selectedUser.name);
      
      // Initialize WebRTC
      webRTCManager.current = new WebRTCManager(
        (remoteStream) => {
          // Handle remote audio stream
          const remoteAudio = new Audio();
          remoteAudio.srcObject = remoteStream;
          remoteAudio.play().catch(console.error);
        },
        (connectionState) => {
          console.log('Connection state changed:', connectionState);
          if (connectionState === 'connected') {
            setCallState('connected');
            ringtoneManager.current?.stopRinging();
            toast({
              title: "Call Connected",
              description: `Connected to ${selectedUser.displayName || selectedUser.name}`,
            });
          } else if (connectionState === 'failed' || connectionState === 'disconnected') {
            endCall();
          }
        }
      );

      // Initialize call with microphone access
      await webRTCManager.current.initializeCall();
      
      // Signal call initiation
      const { data, error } = await supabase.functions.invoke('call-signaling', {
        body: {
          action: 'initiate_call',
          fromUserId: currentUserId,
          toUserId: selectedUser.id,
          fromUserName: 'You',
          toUserName: selectedUser.displayName || selectedUser.name
        }
      });

      if (error) throw error;

      // Simulate call connection process
      setTimeout(async () => {
        // Simulate random call outcome
        const isAvailable = Math.random() > 0.3; // 70% chance user is available
        
        if (isAvailable) {
          setCallState('connecting');
          
          // Simulate connection time
          setTimeout(() => {
            setCallState('connected');
            ringtoneManager.current?.stopRinging();
            onCallStart?.();
          }, 2000 + Math.random() * 3000); // 2-5 seconds
        } else {
          // User unavailable
          await handleUnavailableUser();
        }
      }, 3000 + Math.random() * 4000); // Ring for 3-7 seconds
      
    } catch (error) {
      console.error('Error starting call:', error);
      ringtoneManager.current?.stopRinging();
      setCallState('idle');
      toast({
        title: "Call Failed",
        description: "Could not start the call. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleUnavailableUser = async () => {
    try {
      setCallState('unavailable');
      ringtoneManager.current?.stopRinging();
      
      // Get voice message for unavailable user
      const { data, error } = await supabase.functions.invoke('call-signaling', {
        body: {
          action: 'unavailable',
          toUserName: selectedUser.displayName || selectedUser.name
        }
      });

      if (data?.audioContent) {
        ringtoneManager.current?.playUnavailableMessage(data.audioContent);
      }

      toast({
        title: "User Unavailable",
        description: `${selectedUser.displayName || selectedUser.name} is currently unavailable`,
        variant: "destructive",
      });

      // Auto-close after message
      setTimeout(() => {
        setCallState('idle');
      }, 5000);
      
    } catch (error) {
      console.error('Error handling unavailable user:', error);
      setCallState('idle');
    }
  };

  const endCall = () => {
    webRTCManager.current?.endCall();
    ringtoneManager.current?.stopRinging();
    ringtoneManager.current?.cleanup();
    
    setCallState('idle');
    setCallDuration(0);
    setIsMuted(false);
    
    toast({
      title: "Call Ended",
      description: `Call with ${selectedUser.displayName || selectedUser.name} ended`,
    });
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    webRTCManager.current?.muteAudio(newMuted);
    
    toast({
      title: newMuted ? "Muted" : "Unmuted",
      description: newMuted ? "Microphone turned off" : "Microphone turned on",
    });
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    toast({
      title: isSpeakerOn ? "Speaker Off" : "Speaker On",
      description: isSpeakerOn ? "Audio muted" : "Audio unmuted",
    });
  };

  const getCallStateText = () => {
    switch (callState) {
      case 'ringing': return 'Ringing...';
      case 'connecting': return 'Connecting...';
      case 'connected': return formatDuration(callDuration);
      case 'unavailable': return 'User Unavailable';
      default: return '';
    }
  };

  if (callState === 'idle') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={startCall}
        className="h-9 w-9 p-0 hover:bg-green-100 hover:text-green-600"
        title="Start voice call"
      >
        <Phone className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">{/* Hide close button */}
        <DialogHeader>
          <DialogTitle className="text-center">
            {callState === 'unavailable' ? 'User Unavailable' : `Voice Call with ${selectedUser.displayName || selectedUser.name}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* User Avatar with dynamic state */}
          <div className="relative">
            <div className={`w-24 h-24 ${
              callState === 'unavailable' ? 'bg-red-500' : 
              callState === 'connected' ? 'bg-green-500' : 'bg-blue-500'
            } rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
              {(selectedUser.displayName || selectedUser.name).substring(0, 2).toUpperCase()}
            </div>
            {/* Animated ring for ringing state */}
            {callState === 'ringing' && (
              <div className="absolute inset-0 w-24 h-24 border-4 border-blue-400 rounded-full animate-ping"></div>
            )}
            {/* Online indicator for connected state */}
            {callState === 'connected' && (
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>

          {/* Call Status */}
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              {selectedUser.displayName || selectedUser.name}
            </p>
            <p className="text-sm text-gray-500">{selectedUser.position}</p>
            <p className={`text-lg font-mono mt-2 ${
              callState === 'connected' ? 'text-green-600' : 
              callState === 'unavailable' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {getCallStateText()}
            </p>
          </div>

          {/* Call Controls - only show for active states */}
          {(callState === 'connected' || callState === 'connecting') && (
            <div className="flex items-center space-x-4">
            {/* Mute Button */}
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={toggleMute}
              className="w-12 h-12 rounded-full p-0"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {/* End Call Button */}
            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="w-14 h-14 rounded-full p-0 bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            {/* Speaker Button */}
            <Button
              variant={!isSpeakerOn ? "destructive" : "secondary"}
              size="lg"
              onClick={toggleSpeaker}
              className="w-12 h-12 rounded-full p-0"
            >
              {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            </div>
          )}

          {/* End Call / Cancel button - show when not connected */}
          {callState !== 'connected' && callState !== 'connecting' && (
            <div className="flex justify-center">
              <Button
                variant="destructive"
                size="lg"
                onClick={endCall}
                className="w-14 h-14 rounded-full p-0 bg-red-500 hover:bg-red-600"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          )}

          {/* Call Status Text */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {callState === 'ringing' && "Calling user..."} 
              {callState === 'connecting' && "Establishing connection..."}
              {callState === 'connected' && (
                <>
                  {isMuted && "Microphone is muted"} 
                  {!isSpeakerOn && "Audio is muted"}
                  {!isMuted && isSpeakerOn && "Call in progress"}
                </>
              )}
              {callState === 'unavailable' && "Please try again later"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCallButton;