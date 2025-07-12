
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Phone, 
  Video, 
  Search, 
  Plus,
  X,
  Send,
  Circle
} from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { useEmployees } from "@/hooks/useEmployees";
import { format } from "date-fns";

const MessagingPanel = ({ onClose }: { onClose: () => void }) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const { conversations, messages, sendMessage, createConversation } = useMessages(selectedConversation || undefined);
  const { userPresences } = usePresence();
  const { data: employees } = useEmployees();

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    await sendMessage.mutateAsync({ content: newMessage });
    setNewMessage("");
  };

  const handleCreateDirectMessage = async (employeeId: string) => {
    const conversation = await createConversation.mutateAsync({
      participants: [employeeId],
      type: "direct"
    });
    setSelectedConversation(conversation.id);
    setShowNewChat(false);
  };

  const getPresenceStatus = (userId: string) => {
    const presence = userPresences?.find(p => p.user_id === userId);
    return presence?.status || "offline";
  };

  const getPresenceColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const filteredEmployees = employees?.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] flex flex-col shadow-xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold">Messages</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Conversations List */}
        <div className="w-32 border-r flex flex-col">
          <div className="p-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => setShowNewChat(!showNewChat)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            {conversations?.map((conv) => (
              <Button
                key={conv.id}
                variant={selectedConversation === conv.id ? "secondary" : "ghost"}
                size="sm"
                className="w-full mb-1 h-auto p-2"
                onClick={() => setSelectedConversation(conv.id)}
              >
                <div className="flex flex-col items-center gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {conv.name?.[0] || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate w-full">
                    {conv.name || "Chat"}
                  </span>
                </div>
              </Button>
            ))}
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {showNewChat ? (
            /* New Chat Interface */
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b">
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
              </div>
              <ScrollArea className="flex-1 p-2">
                {filteredEmployees?.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleCreateDirectMessage(employee.id)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <Circle 
                        className={`absolute -bottom-1 -right-1 h-3 w-3 ${getPresenceColor(getPresenceStatus(employee.id))} rounded-full border-2 border-white`}
                        fill="currentColor"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{employee.name}</p>
                      <p className="text-xs text-gray-500 truncate">{employee.position}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getPresenceStatus(employee.id)}
                    </Badge>
                  </div>
                ))}
              </ScrollArea>
            </div>
          ) : selectedConversation ? (
            /* Chat Interface */
            <>
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>C</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">Chat</p>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  {messages?.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === selectedConversation ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] p-2 rounded-lg ${
                        message.sender_id === selectedConversation 
                          ? 'bg-gray-100' 
                          : 'bg-blue-500 text-white'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(message.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-3 border-t">
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
            /* Welcome Screen */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MessagingPanel;
