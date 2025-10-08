import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  conversation_id: string;
  created_at: string;
  type: 'text' | 'image' | 'file';
  metadata?: any;
  read_at?: string;
  reply_to_id?: string;
  replied_message?: Message;
}

interface ConversationParticipant {
  user_id: string;
  employee_name: string;
  employee_email: string;
  avatar_url?: string;
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

interface LatestMessageNotification {
  content: string;
  senderName: string;
  conversationId: string;
  timestamp: string;
}

export const useMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestMessageNotification, setLatestMessageNotification] = useState<LatestMessageNotification | null>(null);
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    try {
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
                .select('name, email, auth_user_id, avatar_url')
                .eq('auth_user_id', p.user_id)
                .single();

              return {
                user_id: p.user_id,
                employee_name: employee?.name || 'Unknown',
                employee_email: employee?.email || '',
                avatar_url: employee?.avatar_url || undefined
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

          // Calculate unread count for this conversation
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            id: conv.id,
            name: conv.name,
            type: conv.type as 'direct' | 'group',
            created_at: conv.created_at,
            participants: participantDetails,
            lastMessage: lastMsg ? {
              ...lastMsg,
              type: lastMsg.type as 'text' | 'image' | 'file'
            } : undefined,
            unread_count: unreadCount || 0
          };
        })
      );

      setConversations(conversationsWithParticipants);
      
      // Calculate total unread count - count messages not sent by current user that are unread
      let totalUnread = 0;
      for (const conv of conversationsWithParticipants) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .is('read_at', null);
        
        totalUnread += (count || 0);
      }
      
      console.log('📊 Total unread messages:', totalUnread);
      setUnreadCount(totalUnread);
      
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [toast]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          replied_message:reply_to_id (
            id,
            content,
            sender_name,
            sender_id,
            conversation_id,
            created_at,
            type
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const mappedMessages = (data || []).map(msg => ({
        ...msg,
        type: msg.type as 'text' | 'image' | 'file',
        replied_message: msg.replied_message ? {
          ...msg.replied_message,
          type: msg.replied_message.type as 'text' | 'image' | 'file'
        } as Message : undefined
      }));
      setMessages(mappedMessages);

      // Mark messages as read (for messages not sent by current user)
      if (user) {
        const unreadMessages = mappedMessages.filter(
          msg => !msg.read_at && msg.sender_id !== user.id
        );
        
        if (unreadMessages.length > 0) {
          console.log(`📩 Marking ${unreadMessages.length} messages as read`);
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadMessages.map(m => m.id));
          
          // Refresh conversations to recalculate unread count accurately
          console.log('🔄 Refreshing unread count');
          fetchConversations();
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
    }
  }, [toast]);

  const sendMessage = async ({ content, conversationId, replyToId, senderName }: {
    content: string;
    conversationId: string;
    replyToId?: string;
    senderName?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Optimistically add message to UI
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: senderName,
        content,
        type: 'text',
        created_at: new Date().toISOString(),
        metadata: {},
        reply_to_id: replyToId
      };
      
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to database
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_name: senderName,
          content,
          type: 'text',
          reply_to_id: replyToId
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

  const sendFile = async ({ file, conversationId, senderName }: {
    file: File;
    conversationId: string;
    senderName?: string;
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
        sender_name: senderName,
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
          sender_name: senderName,
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

  // Fetch conversations on mount and set up aggressive polling
  useEffect(() => {
    console.log('🚀 useMessages hook initialized');
    fetchConversations();
    
    // Poll for new messages every 1 second for instant updates
    const pollInterval = setInterval(() => {
      fetchConversations();
    }, 1000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchConversations]);

  // Set up real-time subscription
  useEffect(() => {
    console.log('📡 Setting up real-time subscription for messages');
    
    const channel = supabase
      .channel('messages-realtime-channel', {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('🔔 New message received via WebSocket:', payload);
          const newMessage = payload.new as Message;
          const { data: { user } } = await supabase.auth.getUser();
          console.log('👤 Current user:', user?.id, 'Message sender:', newMessage.sender_id);
          
          // Update messages if viewing this conversation
          setMessages(prev => {
            const filtered = prev.filter(m => !m.id.startsWith('temp-'));
            if (!filtered.find(m => m.id === newMessage.id)) {
              return [...filtered, newMessage];
            }
            return filtered;
          });
          
          // If message is not from current user, show notification and increment unread count
          if (user && newMessage.sender_id !== user.id && !newMessage.read_at) {
            console.log('📨 Message is from another user, showing notification');
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log('📊 Updated unread count:', newCount);
              return newCount;
            });
            
            // Fetch sender info for notification
            const { data: senderEmployee } = await supabase
              .from('employees')
              .select('name')
              .eq('auth_user_id', newMessage.sender_id)
              .single();
            
            console.log('👤 Sender employee:', senderEmployee);
            
            const notification = {
              content: newMessage.content || 'Sent an attachment',
              senderName: senderEmployee?.name || 'Someone',
              conversationId: newMessage.conversation_id,
              timestamp: newMessage.created_at
            };
            
            console.log('🔔 Setting notification:', notification);
            setLatestMessageNotification(notification);
          } else {
            console.log('⏭️ Skipping notification - message is from current user or already read');
          }
          
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
          console.log('📝 Message updated:', payload);
          const updatedMessage = payload.new as Message;
          console.log('🔄 Updated message read_at:', updatedMessage.read_at);
          setMessages(prev => {
            const updated = prev.map(m => {
              if (m.id === updatedMessage.id) {
                console.log('✅ Updating message in state:', m.id, 'read_at:', updatedMessage.read_at);
                return updatedMessage;
              }
              return m;
            });
            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to messages channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to messages channel');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Messages channel subscription timed out');
        }
      });

    return () => {
      console.log('🧹 Cleaning up messages subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    conversations,
    messages,
    loading,
    unreadCount,
    latestMessageNotification,
    clearLatestNotification: () => setLatestMessageNotification(null),
    fetchConversations,
    fetchMessages,
    sendMessage,
    sendFile,
    createConversation
  };
};