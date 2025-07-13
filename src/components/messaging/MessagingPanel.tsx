
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageCircle, Send, X, Users, Search } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  conversationId: string;
}

interface Conversation {
  id: string;
  name: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
}

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

const MessagingPanel: React.FC<MessagingPanelProps> = ({
  isOpen,
  onClose,
  currentUserId
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    if (isOpen) {
      const mockConversations: Conversation[] = [
        {
          id: '1',
          name: 'General Discussion',
          participants: ['current-user', 'user-2', 'user-3'],
          unreadCount: 2,
          lastMessage: {
            id: 'msg-1',
            content: 'Welcome to the team chat!',
            senderId: 'user-2',
            senderName: 'John Doe',
            timestamp: new Date().toISOString(),
            conversationId: '1'
          }
        },
        {
          id: '2',
          name: 'Quality Control Team',
          participants: ['current-user', 'user-4'],
          unreadCount: 0,
          lastMessage: {
            id: 'msg-2',
            content: 'Quality assessment completed for Batch #234',
            senderId: 'user-4',
            senderName: 'Jane Smith',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            conversationId: '2'
          }
        }
      ];
      
      setConversations(mockConversations);
    }
  }, [isOpen]);

  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation);
    
    // Mock messages for the selected conversation
    const mockMessages: Message[] = [
      {
        id: 'm1',
        content: 'Hello team!',
        senderId: 'user-2',
        senderName: 'John Doe',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        conversationId: conversation.id
      },
      {
        id: 'm2',
        content: 'Hi John, how are the quality assessments going?',
        senderId: currentUserId,
        senderName: 'You',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        conversationId: conversation.id
      },
      {
        id: 'm3',
        content: conversation.lastMessage?.content || 'Latest message',
        senderId: conversation.lastMessage?.senderId || 'user-2',
        senderName: conversation.lastMessage?.senderName || 'Team Member',
        timestamp: conversation.lastMessage?.timestamp || new Date().toISOString(),
        conversationId: conversation.id
      }
    ];
    
    setMessages(mockMessages);
    
    // Mark conversation as read
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage,
      senderId: currentUserId,
      senderName: 'You',
      timestamp: new Date().toISOString(),
      conversationId: activeConversation.id
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Update conversation's last message
    setConversations(prev =>
      prev.map(conv =>
        conv.id === activeConversation.id
          ? { ...conv, lastMessage: message }
          : conv
      )
    );
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[600px] p-0">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages
              </SheetTitle>
            </SheetHeader>
            
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 p-4">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeConversation?.id === conversation.id
                        ? 'bg-blue-50 border-blue-200 border'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleConversationSelect(conversation)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {conversation.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {conversation.name}
                          </p>
                          {conversation.lastMessage && (
                            <p className="text-xs text-gray-500 truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {activeConversation.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{activeConversation.name}</h3>
                        <p className="text-sm text-gray-500">
                          {activeConversation.participants.length} members
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                            message.senderId === currentUserId
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {message.senderId !== currentUserId && (
                            <p className="text-xs font-medium mb-1">
                              {message.senderName}
                            </p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === currentUserId ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MessagingPanel;
