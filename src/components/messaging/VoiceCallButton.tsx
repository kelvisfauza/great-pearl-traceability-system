import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceCallButtonProps {
  selectedUser: any;
  onCallStart?: () => void;
}

const VoiceCallButton = ({ selectedUser, onCallStart }: VoiceCallButtonProps) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const { toast } = useToast();

  // Timer for call duration
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = async () => {
    try {
      // Check for microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      
      setIsCallActive(true);
      setCallDuration(0);
      onCallStart?.();
      
      toast({
        title: "Call Started",
        description: `Voice call with ${selectedUser.displayName || selectedUser.name}`,
      });

      // Here you would integrate with OpenAI Realtime API or WebRTC
      console.log('Starting voice call with:', selectedUser);
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallDuration(0);
    setIsMuted(false);
    
    toast({
      title: "Call Ended",
      description: `Call with ${selectedUser.displayName || selectedUser.name} ended`,
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Unmuted" : "Muted",
      description: isMuted ? "Microphone turned on" : "Microphone turned off",
    });
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    toast({
      title: isSpeakerOn ? "Speaker Off" : "Speaker On",
      description: isSpeakerOn ? "Audio muted" : "Audio unmuted",
    });
  };

  if (!isCallActive) {
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
    <Dialog open={isCallActive} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">{/* Hide close button */}
        <DialogHeader>
          <DialogTitle className="text-center">
            Voice Call with {selectedUser.displayName || selectedUser.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* User Avatar */}
          <div className="relative">
            <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(selectedUser.displayName || selectedUser.name).substring(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
          </div>

          {/* Call Status */}
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              {selectedUser.displayName || selectedUser.name}
            </p>
            <p className="text-sm text-gray-500">{selectedUser.position}</p>
            <p className="text-lg font-mono text-gray-700 mt-2">
              {formatDuration(callDuration)}
            </p>
          </div>

          {/* Call Controls */}
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

          {/* Call Status Text */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {isMuted && "Microphone is muted"} 
              {!isSpeakerOn && "Audio is muted"}
              {!isMuted && isSpeakerOn && "Call in progress"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCallButton;