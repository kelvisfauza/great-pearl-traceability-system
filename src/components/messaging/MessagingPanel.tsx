
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, X } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagingPanel = ({ isOpen, onClose }: MessagingPanelProps) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const { employee } = useAuth();
  
  const {
    conversations,
    messages,
    loading,
    sendMessage,
    fetchMessages,
    createConversation
  } = useMessages(employee?.id);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !employee?.id) return;

    try {
      let conversationId = selectedConversation;
      
      if (!conversationId) {
        // Create a new conversation if none selected
        const newConversation = await createConversation({
          type: 'direct',
          participantIds: [employee.id]
        });
        conversationId = newConversation.id;
        setSelectedConversation(conversationId);
      }

      await sendMessage({
        content: newMessage,
        conversationId,
        senderId: employee.id
      });
      
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
    <div className="fixed right-4 bottom-20 w-80 h-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Messages</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-80">
        {/* Conversations List */}
        <div className="w-1/3 border-r">
          <ScrollArea className="h-full">
            <div className="p-2">
              {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="text-sm text-gray-500">No conversations</div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      selectedConversation === conversation.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="font-medium text-sm truncate">
                      {conversation.name || 'Conversation'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-2">
            {messages.map((message) => (
              <div key={message.id} className="mb-2">
                <div className="flex items-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {message.senderId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="text-sm">{message.content}</div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-2 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button size="sm" onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagingPanel;
