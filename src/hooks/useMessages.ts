import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
// Remove supabase import - will be handled by compatibility layer

interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  type: 'text' | 'image' | 'file';
}

interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'channel';
  createdAt: string;
  lastMessage?: Message;
  participants: string[];
}

export const useMessages = (userId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      // Temporarily return empty data - will be implemented with Firebase later
      setConversations([]);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      // Temporarily return empty data
      setMessages([]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive"
      });
    } finally {
      setLoadingMessages(false);
    }
  }, [toast]);

  const sendMessage = async ({ content, conversationId, senderId, type = 'text' }: {
    content: string;
    conversationId: string | null;
    senderId: string;  // Use Firebase User.uid
    type?: string;
  }) => {
    try {
      // Temporarily do nothing - will be implemented with Firebase later
      console.log('Message would be sent:', { content, conversationId, senderId, type });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const createConversation = async ({ name, type, participantIds }: {
    name?: string;
    type: 'direct' | 'group' | 'channel';
    participantIds: string[];
  }) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // Temporarily return mock data
      return { id: 'temp-id', name: name || 'New Conversation' };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!userId) return;

    try {
      // Temporarily do nothing
      console.log('Would mark as read:', conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      // Temporarily do nothing
      console.log('Would delete conversation:', conversationId);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchConversations();
    // Mock subscription setup
    const unsubscribe = () => {
      console.log('Unsubscribing from conversation updates');
    };

    return () => {
      unsubscribe();
    };
  }, [userId, fetchConversations]);

  useEffect(() => {
    let unread = 0;
    conversations.forEach(conversation => {
      if (conversation.lastMessage?.senderId !== userId) {
        unread++;
      }
    });
    setUnreadCount(unread);
  }, [conversations, userId]);

  return {
    conversations,
    messages,
    loading,
    loadingMessages,
    unreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    markAsRead,
    deleteConversation
  };
};
