import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, Send } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagingPanel = ({ isOpen, onClose }: MessagingPanelProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const { user } = useAuth();
  
  const {
    messages = [],
    users = [],
    loading,
    sendMessage
  } = useMessages(user?.id);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await sendMessage(selectedUser.id, newMessage);
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
      isMinimized ? 'w-80 h-16' : 'w-[500px] h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Messages</h3>
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
          <div className="w-1/3 border-r border-gray-200 bg-gray-50">
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Users</h4>
              <ScrollArea className="h-[400px]">
                {users.map((user) => (
                  <div 
                    key={user.id}
                    className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      selectedUser?.id === user.id ? 'bg-blue-100' : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="font-medium text-sm">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          {/* Right Area - Chat */}
          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">
                      No messages yet. Start a conversation!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`mb-3 ${message.senderId === user?.id ? 'text-right' : 'text-left'}`}
                      >
                        <div className={`inline-block p-2 rounded-lg max-w-xs ${
                          message.senderId === user?.id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {message.content}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a user to start chatting
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingPanel;