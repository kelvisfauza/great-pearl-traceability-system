
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Users, MessageSquare } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Conversation {
  id: string;
  name: string;
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: string;
    sender: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  conversationId: string;
}

const MessagingPanel = ({ isOpen, onClose }: MessagingPanelProps) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const { messages: hookMessages, sendMessage } = useMessages();

  // Mock conversations for demonstration
  useEffect(() => {
    setConversations([
      {
        id: "1",
        name: "General Discussion",
        participants: ["Admin", "Manager", "User"],
        lastMessage: {
          content: "Let's discuss the quarterly reports",
          timestamp: "10:30 AM",
          sender: "Manager"
        },
        unreadCount: 2
      },
      {
        id: "2", 
        name: "Quality Control Team",
        participants: ["QC Lead", "Inspector", "Analyst"],
        lastMessage: {
          content: "New batch needs inspection",
          timestamp: "9:15 AM",
          sender: "QC Lead"
        },
        unreadCount: 0
      }
    ]);
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessage(selectedConversation.id, newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Mock messages for the selected conversation
    setMessages([
      {
        id: "1",
        content: "Hello everyone!",
        sender: "Admin",
        timestamp: "9:00 AM",
        conversationId: conversation.id
      },
      {
        id: "2",
        content: "Good morning, ready for the meeting?",
        sender: "Manager", 
        timestamp: "9:05 AM",
        conversationId: conversation.id
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex">
        {!selectedConversation ? (
          <div className="w-full">
            <div className="p-4 border-b">
              <h3 className="font-medium text-sm text-gray-600 uppercase tracking-wider">
                Conversations
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {conversations.map((conversation) => (
                  <Card 
                    key={conversation.id}
                    className="mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{conversation.name}</h4>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {conversation.participants.length} participants
                        </span>
                      </div>
                      {conversation.lastMessage && (
                        <div>
                          <p className="text-xs text-gray-600 truncate">
                            <span className="font-medium">{conversation.lastMessage.sender}:</span>{" "}
                            {conversation.lastMessage.content}
                          </p>
                          <span className="text-xs text-gray-400">
                            {conversation.lastMessage.timestamp}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="w-full flex flex-col">
            <div className="p-4 border-b">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedConversation(null)}
                className="mb-2"
              >
                ← Back to conversations
              </Button>
              <h3 className="font-medium">{selectedConversation.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                <Users className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {selectedConversation.participants.join(", ")}
                </span>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {message.sender.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{message.sender}</span>
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-700">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="sm">
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
