
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Send, X, Users, Plus, ArrowLeft } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagingPanel = ({ isOpen, onClose }: MessagingPanelProps) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedConversationName, setSelectedConversationName] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
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

  useEffect(() => {
    if (selectedConversation) {
      const conversation = conversations.find(c => c.id === selectedConversation);
      if (conversation) {
        setSelectedConversationName(conversation.name || 'Conversation');
        fetchMessages(selectedConversation);
        markAsRead(selectedConversation);
      }
    }
  }, [selectedConversation, conversations, fetchMessages, markAsRead]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.uid || !employee?.id) return;

    try {
      if (selectedConversation) {
        // Send message to existing conversation
        await sendMessage({
          content: newMessage,
          conversationId: selectedConversation
        });
      } else if (selectedEmployee) {
        // Create new conversation and send message
        await sendMessage({
          content: newMessage,
          recipientUserId: selectedEmployee.userId || selectedEmployee.id,
          recipientEmployeeId: selectedEmployee.id,
          recipientName: selectedEmployee.name
        });
        setShowNewMessage(false);
        setSelectedEmployee(null);
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

  const handleStartNewConversation = (emp: any) => {
    setSelectedEmployee(emp);
    setSelectedConversation(null);
    setSelectedConversationName(emp.name);
    setShowNewMessage(false);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setSelectedEmployee(null);
    setSelectedConversationName('');
  };

  const getConversationName = (conversation: any) => {
    if (conversation.name) return conversation.name;
    
    // For direct conversations, show the other participant's name
    const otherParticipantIndex = conversation.participantNames?.findIndex(
      (name: string, index: number) => conversation.participants[index] !== user?.uid
    );
    
    if (otherParticipantIndex !== -1 && conversation.participantNames) {
      return conversation.participantNames[otherParticipantIndex];
    }
    
    return 'Unknown User';
  };

  const getUnreadCount = (conversation: any) => {
    if (!conversation.lastMessage || conversation.lastMessage.senderId === user?.uid) {
      return 0;
    }
    
    const readBy = conversation.lastMessage.readBy || [];
    return readBy.includes(user?.uid) ? 0 : 1;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 bottom-20 w-96 h-[500px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {(selectedConversation || selectedEmployee) && (
            <Button variant="ghost" size="sm" onClick={handleBackToConversations}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h3 className="font-semibold">
            {selectedConversation || selectedEmployee ? selectedConversationName : 'Messages'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!selectedConversation && !selectedEmployee && (
            <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <ScrollArea className="h-64">
                    {employees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer rounded"
                        onClick={() => handleStartNewConversation(emp)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {emp.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-sm text-gray-500">
                            {emp.position} - {emp.department}
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex h-[420px]">
        {!selectedConversation && !selectedEmployee ? (
          // Conversations List
          <div className="w-full">
            <ScrollArea className="h-full">
              <div className="p-2">
                {loading ? (
                  <div className="text-sm text-gray-500 p-4">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="text-sm text-gray-500 p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <div>No conversations yet</div>
                    <div className="text-xs">Start a new conversation to get started</div>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const unread = getUnreadCount(conversation);
                    return (
                      <div
                        key={conversation.id}
                        className="p-3 rounded cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {getConversationName(conversation).split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {getConversationName(conversation)}
                              </div>
                              {conversation.lastMessage && (
                                <div className="text-xs text-gray-500 truncate">
                                  {conversation.lastMessage.content}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {conversation.lastMessageAt && (
                              <div className="text-xs text-gray-400">
                                {new Date(conversation.lastMessageAt).toLocaleDateString()}
                              </div>
                            )}
                            {unread > 0 && (
                              <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                {unread}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Messages View
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-3">
              {loadingMessages ? (
                <div className="text-sm text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-500 text-center mt-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const isOwnMessage = message.senderId === user?.uid;
                    return (
                      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                          isOwnMessage 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {!isOwnMessage && (
                            <div className="text-xs opacity-75 mb-1">
                              {message.senderName}
                            </div>
                          )}
                          <div className="text-sm">{message.content}</div>
                          <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder={`Message ${selectedConversationName}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingPanel;
