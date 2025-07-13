import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plus, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  name: string;
  participants: string[];
  lastMessage?: Message;
}

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

const MessagingPanel = ({ isOpen, onClose, currentUserId }: MessagingPanelProps) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [newConversationName, setNewConversationName] = useState('');
  const [showNewConversationInput, setShowNewConversationInput] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { 
    conversations, 
    messages, 
    loading, 
    loadingMessages,
    fetchConversations, 
    fetchMessages, 
    sendMessage,
    createConversation,
    deleteConversation
  } = useMessages(currentUserId);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchConversations();
    }
  }, [isOpen, currentUserId, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages]);

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleNewConversationClick = () => {
    setShowNewConversationInput(true);
  };

  const handleCreateConversation = async () => {
    if (!newConversationName.trim()) {
      toast({
        title: "Error",
        description: "Conversation name is required",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingConversation(true);
    try {
      const newConversation = await createConversation({
        name: newConversationName,
        type: 'direct',
        participantIds: [currentUserId]
      });

      if (newConversation) {
        fetchConversations();
        setSelectedConversation(newConversation);
        setNewConversationName('');
        setShowNewConversationInput(false);
        toast({
          title: "Success",
          description: "Conversation created successfully"
        });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const confirmDeleteConversation = (conversationId: string) => {
    setConversationToDelete(conversationId);
  };

  const handleCancelDelete = () => {
    setConversationToDelete(null);
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;

    setIsDeletingConversation(true);
    try {
      await deleteConversation(conversationToDelete);
      fetchConversations();
      setSelectedConversation(null);
      toast({
        title: "Success",
        description: "Conversation deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    } finally {
      setIsDeletingConversation(false);
      setConversationToDelete(null);
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    try {
      await sendMessage({
        content: newMessage,
        conversationId: selectedConversation?.id || null,
        senderId: currentUserId, // Use Firebase User.uid
        type: 'text'
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Messaging
                  </h3>
                  <div className="mt-2">
                    <div className="flex h-96">
                      {/* Conversations List */}
                      <div className="w-1/3 border-r pr-2">
                        <div className="mb-4">
                          <Button variant="outline" size="sm" onClick={handleNewConversationClick} disabled={isCreatingConversation}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Chat
                          </Button>
                          {showNewConversationInput && (
                            <div className="mt-2 flex items-center">
                              <Input
                                type="text"
                                placeholder="Chat name"
                                value={newConversationName}
                                onChange={(e) => setNewConversationName(e.target.value)}
                                className="mr-2"
                              />
                              <Button size="sm" onClick={handleCreateConversation} disabled={isCreatingConversation}>
                                {isCreatingConversation ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  "Create"
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                        <ScrollArea className="h-[320px] rounded-md border p-4">
                          {loading ? (
                            <div className="text-center">Loading conversations...</div>
                          ) : (
                            <ul className="space-y-2">
                              {conversations.map((conversation) => (
                                <li
                                  key={conversation.id}
                                  className={`p-2 rounded cursor-pointer ${selectedConversation?.id === conversation.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                                    }`}
                                  onClick={() => handleConversationSelect(conversation)}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{conversation.name}</span>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete this conversation and remove your data from our servers.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => {
                                              confirmDeleteConversation(conversation.id);
                                              handleDeleteConversation();
                                            }}
                                            disabled={isDeletingConversation}
                                          >
                                            {isDeletingConversation ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Deleting...
                                              </>
                                            ) : (
                                              "Delete"
                                            )}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Messages Area */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          {selectedConversation ? (
                            <div className="mb-4">
                              <h4 className="text-lg font-semibold mb-2">{selectedConversation.name}</h4>
                            </div>
                          ) : (
                            <div className="text-center">Select a conversation to view messages</div>
                          )}
                          <ScrollArea className="h-[260px] rounded-md border p-4">
                            {loadingMessages ? (
                              <div className="text-center">Loading messages...</div>
                            ) : (
                              <div className="space-y-2">
                                {messages.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`flex items-start ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                                      }`}
                                  >
                                    {message.senderId !== currentUserId && (
                                      <Avatar className="w-6 h-6 mr-2">
                                        <AvatarImage src={`https://avatar.vercel.sh/${message.senderId}.png`} alt={message.senderId} />
                                        <AvatarFallback>{message.senderId.slice(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                    )}
                                    <div
                                      className={`rounded-lg p-2 text-sm ${message.senderId === currentUserId
                                        ? 'bg-blue-100 text-right'
                                        : 'bg-gray-100 text-left'
                                        }`}
                                    >
                                      {message.content}
                                    </div>
                                  </div>
                                ))}
                                <div ref={messagesEndRef} />
                              </div>
                            )}
                          </ScrollArea>
                        </div>

                        {/* Message Input */}
                        {selectedConversation && (
                          <div className="mt-4">
                            <div className="flex items-center">
                              <Input
                                type="text"
                                placeholder="Enter message"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="mr-2"
                              />
                              <Button onClick={handleSendMessage}>
                                <Send className="h-4 w-4 mr-2" />
                                Send
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagingPanel;
