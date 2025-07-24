import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  messageType: 'text' | 'image' | 'file';
  metadata?: any;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
  role?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface VoiceCall {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'ringing' | 'active' | 'ended';
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export const useMessages = (currentUserId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      // Mock data since users table doesn't exist yet
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'John Admin',
          email: 'admin@company.com',
          department: 'IT',
          role: 'admin',
          isOnline: true
        }
      ];

      console.log('Loaded users:', mockUsers.length);
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const subscribeToMessages = useCallback((userId: string, partnerId: string) => {
    if (!userId || !partnerId) return () => {};

    console.log('Subscribing to messages between:', userId, 'and', partnerId);
    
    // Mock subscription - in real implementation would use Supabase realtime
    setMessages([]);
    setLoading(false);

    return () => {
      console.log('Unsubscribing from messages');
    };
  }, []);

  const subscribeToUserCalls = useCallback((userId: string) => {
    if (!userId) return () => {};

    console.log('Subscribing to calls for user:', userId);
    
    // Mock subscription - in real implementation would use Supabase realtime
    setCalls([]);

    return () => {
      console.log('Unsubscribing from calls');
    };
  }, []);

  const sendMessage = async (receiverId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text', metadata?: any) => {
    if (!currentUserId) {
      throw new Error('Current user ID is required');
    }

    try {
      const messageData = {
        senderId: currentUserId,
        receiverId,
        content,
        messageType,
        metadata,
        timestamp: new Date(),
        read: false
      };

      console.log('Sending message:', messageData);
      
      // Mock message sending - in real implementation would use Supabase
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        ...messageData
      };

      setMessages(prev => [...prev, newMessage]);
      console.log('Message sent successfully');
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      console.log('Marking message as read:', messageId);
      
      // Mock marking as read - in real implementation would use Supabase
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const getConversations = useCallback(async (userId: string) => {
    try {
      console.log('Fetching conversations for user:', userId);
      
      // Mock conversations - in real implementation would use Supabase
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }, []);

  const initiateVoiceCall = async (receiverId: string) => {
    if (!currentUserId) {
      throw new Error('Current user ID is required');
    }

    try {
      const callData = {
        callerId: currentUserId,
        receiverId,
        status: 'ringing' as const,
        startTime: new Date()
      };

      console.log('Initiating voice call:', callData);
      
      // Mock call initiation - in real implementation would use Supabase
      const newCall: VoiceCall = {
        id: `call-${Date.now()}`,
        ...callData
      };

      setCalls(prev => [...prev, newCall]);
      console.log('Voice call initiated successfully');
      
      return newCall;
    } catch (error) {
      console.error('Error initiating voice call:', error);
      throw error;
    }
  };

  const updateCallStatus = async (callId: string, status: 'ringing' | 'active' | 'ended', duration?: number) => {
    try {
      console.log('Updating call status:', callId, status);
      
      // Mock call status update - in real implementation would use Supabase
      setCalls(prev => 
        prev.map(call => 
          call.id === callId 
            ? { 
                ...call, 
                status, 
                ...(status === 'ended' && { endTime: new Date(), duration }) 
              } 
            : call
        )
      );
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  };

  return {
    messages,
    users,
    calls,
    loading,
    subscribeToMessages,
    subscribeToUserCalls,
    sendMessage,
    markAsRead,
    getConversations,
    initiateVoiceCall,
    updateCallStatus,
    fetchUsers
  };
};