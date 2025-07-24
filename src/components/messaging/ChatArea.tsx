import React, { useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Paperclip, Image, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  type: 'text' | 'image' | 'file';
  readBy?: string[];
  fileUrl?: string;
  fileName?: string;
}

interface ChatAreaProps {
  selectedUser: any;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => void;
  onSendFile: (file: File, type: 'image' | 'file') => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  loadingMessages: boolean;
  currentUserId?: string;
}

const ChatArea = ({ 
  selectedUser, 
  messages, 
  newMessage, 
  setNewMessage, 
  onSendMessage, 
  onSendFile,
  onKeyPress, 
  loadingMessages, 
  currentUserId 
}: ChatAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const getMessageStatus = (message: Message) => {
    if (message.senderId !== currentUserId) return null;
    
    const isRead = message.readBy && message.readBy.length > 1; // More than just sender
    return isRead ? 'read' : 'sent';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = event.target.files?.[0];
    if (file) {
      onSendFile(file, type);
      event.target.value = ''; // Reset input
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isConsecutiveMessage = (currentMsg: Message, prevMsg: Message | undefined) => {
    if (!prevMsg) return false;
    return currentMsg.senderId === prevMsg.senderId &&
           new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 60000; // 1 minute
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
          <p className="text-sm text-gray-500">Choose someone from your contacts to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-500 text-white font-medium">
              {selectedUser.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-gray-900">{selectedUser.name}</h2>
            <p className="text-sm text-gray-500">{selectedUser.position} • {selectedUser.department}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageSquare className="h-8 w-8 mb-2" />
            <div className="text-sm">Start a conversation with {selectedUser?.name}</div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId;
              const prevMessage = index > 0 ? messages[index - 1] : undefined;
              const showAvatar = !isConsecutiveMessage(message, prevMessage);
              const messageStatus = getMessageStatus(message);
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${
                    showAvatar ? 'mt-4' : 'mt-1'
                  }`}
                >
                  {/* Left side avatar for other users */}
                  {!isCurrentUser && (
                    <div className="mr-2" style={{ width: '32px' }}>
                      {showAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                            {message.senderName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[70%] ${isCurrentUser ? 'mr-2' : ''}`}>
                    {/* Sender name and time for other users */}
                    {!isCurrentUser && showAvatar && (
                      <div className="text-xs text-gray-600 mb-1 ml-1">
                        {message.senderName} • {formatTime(message.createdAt)}
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`relative rounded-lg px-3 py-2 ${
                      isCurrentUser 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.type === 'image' && message.fileUrl ? (
                        <div>
                          <img 
                            src={message.fileUrl} 
                            alt="Shared image" 
                            className="max-w-full max-h-64 rounded-lg"
                          />
                          {message.content && (
                            <div className="mt-2 text-sm">{message.content}</div>
                          )}
                        </div>
                      ) : message.type === 'file' && message.fileUrl ? (
                        <div className="flex items-center space-x-2">
                          <Paperclip className="h-4 w-4" />
                          <a 
                            href={message.fileUrl} 
                            download={message.fileName}
                            className="text-sm underline hover:no-underline"
                          >
                            {message.fileName || 'File'}
                          </a>
                        </div>
                      ) : (
                        <div className="text-sm">{message.content}</div>
                      )}
                      
                      {/* Time and status indicators for current user */}
                      {isCurrentUser && (
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <span className="text-xs opacity-70">
                            {formatTime(message.createdAt)}
                          </span>
                          {messageStatus === 'sent' && (
                            <Check className="h-3 w-3 opacity-70" />
                          )}
                          {messageStatus === 'read' && (
                            <CheckCheck className="h-3 w-3 opacity-70" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side spacing for current user */}
                  {isCurrentUser && <div style={{ width: '32px' }} />}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-2">
          {/* File attachment buttons */}
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 p-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              className="h-9 w-9 p-0"
            >
              <Image className="h-4 w-4" />
            </Button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'file')}
            accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
          />
          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'image')}
            accept="image/*"
          />

          {/* Message input */}
          <div className="flex-1">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={onKeyPress}
              className="min-h-[40px] max-h-32 resize-none"
              rows={1}
            />
          </div>

          {/* Send button */}
          <Button 
            onClick={onSendMessage} 
            disabled={!newMessage.trim()}
            className="h-9 w-9 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;