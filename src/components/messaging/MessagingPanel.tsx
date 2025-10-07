import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, X, MessageSquarePlus } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import UserSelectorDialog from './UserSelectorDialog';
import { format } from 'date-fns';

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagingPanel = ({ isOpen, onClose }: MessagingPanelProps) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const { employee } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    conversations,
    messages,
    loading,
    loadingMessages,
    sendMessage,
    fetchMessages,
    createConversation
  } = useMessages();

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessage({
        content: newMessage,
        conversationId: selectedConversation
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSelectUser = async (userId: string) => {
    try {
      const result = await createConversation({
        participantId: userId
      });
      setSelectedConversation(result.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const getConversationName = (conversation: any) => {
    if (conversation.name) return conversation.name;
    
    // For direct chats, show the other person's name
    const otherParticipant = conversation.participants?.find(
      (p: any) => p.user_id !== employee?.authUserId
    );
    return otherParticipant?.employee_name || 'Unknown';
  };

  const getCurrentConversation = () => {
    return conversations.find(c => c.id === selectedConversation);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const currentConversation = getCurrentConversation();

  return (
    <>
      <div className="fixed right-4 bottom-20 w-96 h-[600px] bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageSquarePlus className="h-5 w-5 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-foreground truncate">
              {currentConversation ? getConversationName(currentConversation) : 'Messages'}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowUserSelector(true)}
              className="h-8 w-8"
              title="New conversation"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Conversations List */}
          {!selectedConversation && (
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {loading ? (
                    <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
                  ) : conversations.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      <p className="mb-2">No conversations yet</p>
                      <p className="text-xs">Click the + button to start chatting</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        className="w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getConversationName(conversation)
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm truncate">
                                {getConversationName(conversation)}
                              </p>
                              {conversation.lastMessage && (
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {format(new Date(conversation.lastMessage.created_at), 'HH:mm')}
                                </span>
                              )}
                            </div>
                            {conversation.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Messages View */}
          {selectedConversation && (
            <div className="flex-1 flex flex-col">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversation(null)}
                className="mx-2 mt-2 w-fit"
              >
                ← Back to conversations
              </Button>
              
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === employee?.authUserId;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isOwn && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getConversationName(currentConversation!)
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              </div>
                              <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                                {format(new Date(message.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-muted/30">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={!selectedConversation}
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !selectedConversation}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <UserSelectorDialog
        open={showUserSelector}
        onClose={() => setShowUserSelector(false)}
        onSelectUser={handleSelectUser}
      />
    </>
  );
};

export default MessagingPanel;
