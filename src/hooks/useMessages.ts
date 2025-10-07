import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  type: 'text' | 'image' | 'file';
  metadata?: any;
  read_at?: string;
}

interface ConversationParticipant {
  user_id: string;
  employee_name: string;
  employee_email: string;
}

interface Conversation {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  created_at: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unread_count?: number;
}

export const useMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get conversations where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const conversationIds = participantData?.map(p => p.conversation_id) || [];
      
      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      // Get conversations details
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Get participants for each conversation
      const conversationsWithParticipants = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              last_read_at
            `)
            .eq('conversation_id', conv.id);

          // Get employee details for participants
          const participantDetails = await Promise.all(
            (participants || []).map(async (p) => {
              const { data: employee } = await supabase
                .from('employees')
                .select('name, email, auth_user_id')
                .eq('auth_user_id', p.user_id)
                .single();

              return {
                user_id: p.user_id,
                employee_name: employee?.name || 'Unknown',
                employee_email: employee?.email || ''
              };
            })
          );

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: conv.id,
            name: conv.name,
            type: conv.type as 'direct' | 'group',
            created_at: conv.created_at,
            participants: participantDetails,
            lastMessage: lastMsg ? {
              ...lastMsg,
              type: lastMsg.type as 'text' | 'image' | 'file'
            } : undefined
          };
        })
      );

      setConversations(conversationsWithParticipants);
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
  }, [toast]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const mappedMessages = (data || []).map(msg => ({
        ...msg,
        type: msg.type as 'text' | 'image' | 'file'
      }));
      setMessages(mappedMessages);

      // Mark messages as read (for messages not sent by current user)
      if (user) {
        const unreadMessages = mappedMessages.filter(
          msg => !msg.read_at && msg.sender_id !== user.id
        );
        
        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadMessages.map(m => m.id));
        }

        // Update last_read_at in conversation_participants
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
      }
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

  const sendMessage = async ({ content, conversationId }: {
    content: string;
    conversationId: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Optimistically add message to UI
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        type: 'text',
        created_at: new Date().toISOString(),
        metadata: {}
      };
      
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to database
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          type: 'text'
        });

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      throw error;
    }
  };

  const sendFile = async ({ file, conversationId }: {
    file: File;
    conversationId: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Determine message type
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';

      // Optimistically add message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        content: publicUrl,
        type: messageType,
        created_at: new Date().toISOString(),
        metadata: { 
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      };
      
      setMessages(prev => [...prev, optimisticMessage]);

      // Insert message
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: publicUrl,
          type: messageType,
          metadata: { 
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type
          }
        });

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      toast({
        title: "Success",
        description: "File sent successfully"
      });
    } catch (error) {
      console.error('Error sending file:', error);
      toast({
        title: "Error",
        description: "Failed to send file",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createConversation = async ({ participantId, type = 'direct' }: {
    participantId: string;
    type?: 'direct' | 'group';
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if conversation already exists
      const { data: existingParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .in('user_id', [user.id, participantId]);

      if (existingParticipants && existingParticipants.length > 0) {
        // Find conversation where both users are participants
        const conversationCounts: Record<string, number> = {};
        existingParticipants.forEach(p => {
          conversationCounts[p.conversation_id] = (conversationCounts[p.conversation_id] || 0) + 1;
        });

        const existingConvId = Object.keys(conversationCounts).find(
          id => conversationCounts[id] === 2
        );

        if (existingConvId) {
          return { id: existingConvId };
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ type, created_by: user.id })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversation.id, user_id: user.id },
          { conversation_id: conversation.id, user_id: participantId }
        ]);

      if (participantsError) throw participantsError;

      await fetchConversations();
      return { id: conversation.id };
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Update messages if viewing this conversation
          setMessages(prev => {
            // Remove any optimistic message
            const filtered = prev.filter(m => !m.id.startsWith('temp-'));
            // Add new message if not already present
            if (!filtered.find(m => m.id === newMessage.id)) {
              return [...filtered, newMessage];
            }
            return filtered;
          });
          
          // Refresh conversations list
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev => 
            prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  return {
    conversations,
    messages,
    loading,
    loadingMessages,
    unreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    sendFile,
    createConversation
  };
};