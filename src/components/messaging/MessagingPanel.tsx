import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, X, MessageSquarePlus, ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';
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
  
  // Sort conversations by most recent message (most recent on top)
  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = a.lastMessage 
      ? new Date(a.lastMessage.created_at).getTime()
      : new Date(a.created_at).getTime();
    const bTime = b.lastMessage
      ? new Date(b.lastMessage.created_at).getTime()
      : new Date(b.created_at).getTime();
    return bTime - aTime;
  });

  return (
    <>
      <div className="fixed right-4 bottom-20 w-96 h-[600px] bg-background border border-border rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* WhatsApp-style Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedConversation ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary-foreground/10"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm">
                    {getConversationName(currentConversation)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {getConversationName(currentConversation)}
                  </p>
                  <p className="text-xs opacity-80">Online</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary-foreground/10">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary-foreground/10">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary-foreground/10">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">Messages</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8 hover:bg-primary-foreground/10"
                  onClick={() => setShowUserSelector(true)}
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary-foreground/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {selectedConversation ? (
          <>
            {/* WhatsApp-style Messages Area */}
            <ScrollArea className="flex-1 px-4 py-2 bg-muted/20">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquarePlus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === employee?.authUserId;
                    const showDate = index === 0 || 
                      format(new Date(message.created_at), 'yyyy-MM-dd') !== 
                      format(new Date(messages[index - 1].created_at), 'yyyy-MM-dd');
                    
                    return (
                      <React.Fragment key={message.id}>
                        {showDate && (
                          <div className="flex justify-center my-2">
                            <span className="bg-muted/80 text-xs px-3 py-1 rounded-full text-muted-foreground">
                              {format(new Date(message.created_at), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                : 'bg-card border border-border rounded-bl-none'
                            }`}
                          >
                            <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-[10px] mt-1 text-right ${
                              isOwnMessage ? 'opacity-70' : 'text-muted-foreground'
                            }`}>
                              {format(new Date(message.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* WhatsApp-style Message Input */}
            <div className="p-3 bg-muted/30 border-t">
              <div className="flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message"
                  className="flex-1 rounded-full bg-background"
                />
                <Button 
                  onClick={handleSendMessage} 
                  size="icon"
                  className="rounded-full h-10 w-10"
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <ScrollArea className="flex-1 bg-background">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading conversations...</p>
              </div>
            ) : sortedConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquarePlus className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No conversations yet</p>
                <p className="text-sm text-muted-foreground mb-6">Start chatting with your colleagues</p>
                <Button onClick={() => setShowUserSelector(true)} className="rounded-full">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            ) : (
              <div>
                {sortedConversations.map((conversation) => {
                  const lastMessage = conversation.lastMessage;
                  const unreadCount = conversation.unread_count || 0;
                  const conversationName = getConversationName(conversation);
                  
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className="w-full p-3 hover:bg-muted/50 transition-colors text-left flex items-center gap-3 border-b border-border/50"
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {conversationName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-semibold text-sm truncate">
                            {conversationName}
                          </p>
                          {lastMessage && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {format(new Date(lastMessage.created_at), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate flex-1">
                            {lastMessage?.content || 'Tap to start chatting'}
                          </p>
                          {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-medium flex-shrink-0">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        )}
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
