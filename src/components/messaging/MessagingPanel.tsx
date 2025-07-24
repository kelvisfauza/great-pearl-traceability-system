import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import UsersSidebar from './UsersSidebar';
import ChatArea from './ChatArea';
import IncomingCallModal from './IncomingCallModal';

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagingPanel = ({ isOpen, onClose }: MessagingPanelProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const { user, employee } = useAuth();
  
  const {
    conversations,
    messages,
    employees,
    loading,
    loadingMessages,
    sendMessage,
    fetchMessages,
    markAsRead,
    setMessages
  } = useMessages(user?.uid, employee?.id);
  
  const { onlineUsers } = usePresence(user?.uid);

  // Call notifications setup
  const { updateCallStatus } = useCallNotifications({
    currentUserId: user?.uid,
    onIncomingCall: (callData) => {
      console.log('Incoming call received:', callData);
      setIncomingCall(callData);
    },
    onCallStatusChange: async (callData) => {
      console.log('Call status changed:', callData);
      if (callData.status === 'ended' || callData.status === 'missed') {
        setIncomingCall(null);
        
        // Add call message to chat
        const callerEmployee = employees.find(emp => emp.id === callData.caller_id);
        if (callerEmployee) {
          const callMessage = callData.status === 'missed' 
            ? `📞 Missed call from ${callerEmployee.name} at ${new Date(callData.started_at).toLocaleTimeString()}`
            : `📞 Call with ${callerEmployee.name} ended (${callData.duration ? Math.floor(callData.duration / 60) + ':' + (callData.duration % 60).toString().padStart(2, '0') : '0:00'})`;
          
          // Find or create conversation with caller
          const existingConversation = conversations.find(conv => 
            conv.participantEmployeeIds?.includes(callerEmployee.id) && conv.participants?.length === 2
          );

          if (existingConversation) {
            await sendMessage({
              content: callMessage,
              conversationId: existingConversation.id
            });
          } else {
            await sendMessage({
              content: callMessage,
              recipientUserId: callerEmployee.id,
              recipientEmployeeId: callerEmployee.id,
              recipientName: callerEmployee.name
            });
          }
        }
      }
    }
  });

  // Debug logging
  console.log('MessagingPanel - user:', user?.uid, 'employee:', employee?.id);
  console.log('MessagingPanel - loading:', loading, 'conversations:', conversations.length, 'employees:', employees.length);

  // Find conversation when user is selected
  useEffect(() => {
    if (selectedUser && user?.uid) {
      console.log('Selected user changed:', selectedUser.displayName || selectedUser.name);
      
      const conversation = conversations.find(conv => 
        conv.participantEmployeeIds?.includes(selectedUser.id) && conv.participants?.length === 2
      );
      
      if (conversation) {
        console.log('Found existing conversation:', conversation.id);
        fetchMessages(conversation.id);
        markAsRead(conversation.id);
      } else {
        console.log('No existing conversation found');
        setMessages([]);
      }
    } else if (!selectedUser) {
      setMessages([]);
    }
  }, [selectedUser?.id, conversations.length, user?.uid, fetchMessages, markAsRead, setMessages]);

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setNewMessage('');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.uid || !employee?.id || !selectedUser) return;

    try {
      // Find existing conversation
      const existingConversation = conversations.find(conv => 
        conv.participantEmployeeIds?.includes(selectedUser.id) && conv.participants?.length === 2
      );

      if (existingConversation) {
        // Send to existing conversation
        await sendMessage({
          content: newMessage,
          conversationId: existingConversation.id
        });
      } else {
        // Create new conversation and send message
        await sendMessage({
          content: newMessage,
          recipientUserId: selectedUser.userId || selectedUser.id,
          recipientEmployeeId: selectedUser.id,
          recipientName: selectedUser.name
        });
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSendFile = async (file: File, type: 'image' | 'file') => {
    if (!user?.uid || !employee?.id || !selectedUser) return;

    try {
      // For now, we'll simulate file upload by creating a message with file info
      // In a real implementation, you'd upload to storage first
      const fileUrl = URL.createObjectURL(file);
      
      // Find existing conversation
      const existingConversation = conversations.find(conv => 
        conv.participantEmployeeIds?.includes(selectedUser.id) && conv.participants?.length === 2
      );

      if (existingConversation) {
        // Send to existing conversation
        await sendMessage({
          content: `Shared ${type}: ${file.name}`,
          conversationId: existingConversation.id,
          type,
          fileUrl,
          fileName: file.name
        });
      } else {
        // Create new conversation and send message
        await sendMessage({
          content: `Shared ${type}: ${file.name}`,
          recipientUserId: selectedUser.userId || selectedUser.id,
          recipientEmployeeId: selectedUser.id,
          recipientName: selectedUser.name,
          type,
          fileUrl,
          fileName: file.name
        });
      }
    } catch (error) {
      console.error('Failed to send file:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAnswerCall = async () => {
    if (incomingCall) {
      await updateCallStatus(incomingCall.id, 'answered');
      setIncomingCall(null);
      // Here you would also start the WebRTC connection
    }
  };

  const handleDeclineCall = async () => {
    if (incomingCall) {
      await updateCallStatus(incomingCall.id, 'declined');
      setIncomingCall(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`fixed right-4 bottom-20 bg-white border border-gray-200 rounded-lg shadow-lg z-50 transition-all duration-200 ${
        isMinimized ? 'w-80 h-16' : 'w-[900px] h-[600px]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">Microsoft Teams Style Chat</h3>
            {selectedUser && !isMinimized && (
              <span className="text-sm text-gray-500">• {selectedUser.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {!isMinimized && (
          <div className="flex h-[calc(600px-73px)]">
            {/* Left Sidebar - Users */}
            <UsersSidebar
              users={employees}
              selectedUserId={selectedUser?.id || null}
              onUserSelect={handleUserSelect}
              conversations={conversations}
              currentUserId={user?.uid}
              onlineUsers={onlineUsers}
              onCreateNewChat={handleUserSelect}
            />

            {/* Right Area - Chat */}
            <ChatArea
              selectedUser={selectedUser}
              messages={messages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={handleSendMessage}
              onSendFile={handleSendFile}
              onKeyPress={handleKeyPress}
              loadingMessages={loadingMessages}
              currentUserId={user?.uid}
            />
          </div>
        )}
      </div>

      {/* Incoming Call Modal */}
      <IncomingCallModal
        isOpen={!!incomingCall}
        callData={incomingCall}
        onAnswer={handleAnswerCall}
        onDecline={handleDeclineCall}
      />
    </>
  );
};

export default MessagingPanel;