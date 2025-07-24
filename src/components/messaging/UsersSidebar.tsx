import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Users, Plus, MessageCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  position: string;
  department: string;
  displayName?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

interface UsersSidebarProps {
  users: User[];
  selectedUserId: string | null;
  onUserSelect: (user: User) => void;
  conversations: any[];
  currentUserId?: string;
  onlineUsers: string[];
  onCreateNewChat?: (user: User) => void;
}

const UsersSidebar = ({ users, selectedUserId, onUserSelect, conversations, currentUserId, onlineUsers, onCreateNewChat }: UsersSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUnreadCount = (userId: string) => {
    const conversation = conversations.find(conv => 
      conv.participantEmployeeIds?.includes(userId) && conv.participants?.length === 2
    );
    
    if (!conversation?.lastMessage || conversation.lastMessage.senderId === currentUserId) {
      return 0;
    }
    
    const readBy = conversation.lastMessage.readBy || [];
    return readBy.includes(currentUserId) ? 0 : 1;
  };

  const getLastMessage = (userId: string) => {
    const conversation = conversations.find(conv => 
      conv.participantEmployeeIds?.includes(userId) && conv.participants?.length === 2
    );
    
    if (conversation?.lastMessage) {
      const msg = conversation.lastMessage;
      const preview = msg.type === 'text' ? msg.content : 
                     msg.type === 'image' ? '📷 Image' : 
                     '📎 File';
      return preview.length > 30 ? preview.substring(0, 30) + '...' : preview;
    }
    
    return 'No messages yet';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const handleNewChatSelect = (user: User) => {
    setIsNewChatOpen(false);
    if (onCreateNewChat) {
      onCreateNewChat(user);
    } else {
      onUserSelect(user);
    }
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Chats</h2>
          <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Start New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search colleagues..."
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="max-h-60">
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100"
                        onClick={() => handleNewChatSelect(user)}
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {(user.displayName || user.name).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {onlineUsers.includes(user.id) && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.displayName || user.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.position}
                          </p>
                        </div>
                        <MessageCircle className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <div className="text-sm">
                {searchQuery ? 'No colleagues found' : 'No colleagues available'}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => {
                const unreadCount = getUnreadCount(user.id);
                const lastMessage = getLastMessage(user.id);
                const isSelected = selectedUserId === user.id;
                
                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-100 border border-blue-200' 
                        : 'hover:bg-white hover:shadow-sm'
                    }`}
                    onClick={() => onUserSelect(user)}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Status indicator - show green if online */}
                      {onlineUsers.includes(user.id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {user.displayName || user.name}
                      </div>
                      <div className={`text-xs truncate ${
                        isSelected ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        {user.position}
                      </div>
                      <div className={`text-xs truncate ${
                        isSelected ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {user.department}
                      </div>
                      <div className={`text-xs truncate mt-1 ${
                        isSelected ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {lastMessage}
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default UsersSidebar;