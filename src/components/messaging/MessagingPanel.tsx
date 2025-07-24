import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import UsersSidebar from './UsersSidebar';
import ChatArea from './ChatArea';

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagingPanel = ({ isOpen, onClose }: MessagingPanelProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const { user, employee } = useAuth();
  
  const {
    conversations,
    messages,
    employees,
    loading,
    loadingMessages,
    sendMessage,
    fetchMessages,
    markAsRead
  } = useMessages(user?.uid, employee?.id);

  // Debug logging
  console.log('MessagingPanel - user:', user?.uid, 'employee:', employee?.id);
  console.log('MessagingPanel - loading:', loading, 'conversations:', conversations.length, 'employees:', employees.length);

  // Find conversation when user is selected
  useEffect(() => {
    if (selectedUser) {
      const conversation = conversations.find(conv => 
        conv.participantEmployeeIds?.includes(selectedUser.id) && conv.participants?.length === 2
      );
      
      if (conversation) {
        fetchMessages(conversation.id);
        markAsRead(conversation.id);
      } else {
        // No existing conversation, clear messages
        // Messages will be empty until first message is sent
      }
    }
  }, [selectedUser, conversations, fetchMessages, markAsRead]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
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
          />

          {/* Right Area - Chat */}
          <ChatArea
            selectedUser={selectedUser}
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            loadingMessages={loadingMessages}
            currentUserId={user?.uid}
          />
        </div>
      )}
    </div>
  );
};

export default MessagingPanel;