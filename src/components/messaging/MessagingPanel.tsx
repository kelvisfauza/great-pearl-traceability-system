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
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const MessagingPanel = ({ onClose }: { onClose: () => void }) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const { conversations, messages, sendMessage, createConversation } = useMessages(selectedConversation || undefined);
  const { userPresences } = usePresence();
  const { employees } = useEmployees();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    try {
      await sendMessage.mutateAsync({ content: newMessage });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleCreateDirectMessage = async (employeeId: string) => {
    try {
      console.log("Creating conversation for employee:", employeeId);
      
      // Create a direct conversation with the selected employee using their employee ID
      const conversation = await createConversation.mutateAsync({
        participantEmployeeIds: [employeeId], // Pass employee ID, not user ID
        type: "direct"
      });
      
      // Select the new conversation
      setSelectedConversation(conversation.id);
      setShowNewChat(false);
      
      toast({
        title: "Success",
        description: "Conversation created successfully",
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create conversation",
        variant: "destructive"
      });
    }
  };

  const getPresenceStatus = (employeeId: string) => {
    // For now, return a default status since we need to properly map employees to users
    return "offline";
  };

  const getPresenceColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getConversationDisplayName = (conversation: any) => {
    if (!conversation) return "Unknown";
    
    // Use participantName if available for direct messages
    if (conversation.participantName) {
      return conversation.participantName;
    }
    
    // Use conversation name if set
    if (conversation.name && conversation.name !== "Direct Message") {
      return conversation.name;
    }
    
    // For direct messages without participant info, show generic name
    if (conversation.type === "direct") {
      return "Direct Message";
    }
    
    return "Group Chat";
  };

  const getConversationAvatar = (conversation: any) => {
    if (!conversation) return "?";
    const name = getConversationDisplayName(conversation);
    return name.charAt(0).toUpperCase();
  };

  const getCurrentConversation = () => {
    if (!conversations || !selectedConversation) return null;
    return conversations.find(conv => conv.id === selectedConversation) || null;
  };

  const filteredEmployees = employees?.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentConversation = getCurrentConversation();

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
                      {getConversationAvatar(conv)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate w-full">
                    {getConversationDisplayName(conv)}
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
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">Start a new chat</span>
                </div>
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <ScrollArea className="flex-1 p-2">
                {filteredEmployees?.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No employees found</p>
                  </div>
                ) : (
                  filteredEmployees?.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      onClick={() => handleCreateDirectMessage(employee.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
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
                        <p className="text-xs text-gray-400 truncate">{employee.department}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {getPresenceStatus(employee.id)}
                      </Badge>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          ) : selectedConversation && currentConversation ? (
            /* Chat Interface - only render if we have a valid conversation */
            <>
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getConversationAvatar(currentConversation)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {getConversationDisplayName(currentConversation)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentConversation.type === "direct" ? "Direct Message" : "Group Chat"}
                    </p>
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
                  {messages?.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages?.map((message) => {
                      const isCurrentUser = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] p-2 rounded-lg ${
                            isCurrentUser 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {format(new Date(message.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                  <Button 
                    onClick={handleSendMessage} 
                    size="sm"
                    disabled={!newMessage.trim() || sendMessage.isPending}
                  >
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
                <p className="text-gray-500 mb-2">Select a conversation to start messaging</p>
                <p className="text-sm text-gray-400">or click the + button to start a new chat</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MessagingPanel;
