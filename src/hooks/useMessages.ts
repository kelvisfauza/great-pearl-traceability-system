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
      console.log('📤 Attempting to send message:', { conversationId, content: content.substring(0, 50) });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Auth error:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      if (!user) {
        console.error('❌ No user found');
        throw new Error('User not authenticated');
      }

      console.log('✅ User authenticated:', user.id);

      // Verify user is a participant
      const { data: participantCheck, error: participantError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (participantError) {
        console.error('❌ Participant check error:', participantError);
        throw new Error(`Not a participant in this conversation: ${participantError.message}`);
      }

      console.log('✅ User is a participant');

      // Get recipients of this conversation (excluding sender)
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, last_read_at')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

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

      console.log('📝 Inserting message into database...');

      // Send to database
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_name: senderName,
          content,
          type: 'text',
          reply_to_id: replyToId
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Database insert error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        
        throw new Error(`Failed to send message: ${error.message}`);
      }

      console.log('✅ Message sent successfully:', newMessage.id);

      // Check if this is the first unread message and send SMS notifications
      if (participants && participants.length > 0) {
        for (const participant of participants) {
          // Check if participant has any unread messages before this one
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .neq('sender_id', participant.user_id)
            .is('read_at', null)
            .lt('created_at', newMessage.created_at)
            .limit(1);

          // If no previous unread messages, this is the first - send SMS
          const isFirstUnread = !unreadMessages || unreadMessages.length === 0;

          if (isFirstUnread) {
            // Get recipient's phone number and name
            const { data: recipientEmployee } = await supabase
              .from('employees')
              .select('name, phone')
              .eq('auth_user_id', participant.user_id)
              .single();

            if (recipientEmployee?.phone) {
              console.log('📱 Sending first message SMS to:', recipientEmployee.name);
              
              // Send SMS notification
              await supabase.functions.invoke('send-sms', {
                body: {
                  phone: recipientEmployee.phone,
                  message: `Dear ${recipientEmployee.name}, you have a new chat from ${senderName || 'a colleague'}. Open app to read.`,
                  userName: recipientEmployee.name,
                  messageType: 'new_chat_message'
                }
              });

              // Mark SMS as sent
              await supabase
                .from('messages')
                .update({ 
                  sms_notification_sent: true,
                  sms_notification_sent_at: new Date().toISOString()
                })
                .eq('id', newMessage.id);
            }
          }
        }
      }

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error: any) {
      console.error('💥 Error sending message:', error);
      console.error('Error stack:', error.stack);
      
      toast({
        title: "Failed to Send Message",
        description: error.message || "Could not send your message. Please check your connection and try again.",
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

      // Get recipients of this conversation (excluding sender)
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, last_read_at')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

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
      const { data: newMessage, error } = await supabase
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
        })
        .select()
        .single();

      if (error) throw error;

      // Check if this is the first unread message and send SMS notifications
      if (participants && participants.length > 0) {
        for (const participant of participants) {
          // Check if participant has any unread messages before this one
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .neq('sender_id', participant.user_id)
            .is('read_at', null)
            .lt('created_at', newMessage.created_at)
            .limit(1);

          // If no previous unread messages, this is the first - send SMS
          const isFirstUnread = !unreadMessages || unreadMessages.length === 0;

          if (isFirstUnread) {
            // Get recipient's phone number and name
            const { data: recipientEmployee } = await supabase
              .from('employees')
              .select('name, phone')
              .eq('auth_user_id', participant.user_id)
              .single();

            if (recipientEmployee?.phone) {
              console.log('📱 Sending first message SMS to:', recipientEmployee.name);
              
              // Send SMS notification
              await supabase.functions.invoke('send-sms', {
                body: {
                  phone: recipientEmployee.phone,
                  message: `Dear ${recipientEmployee.name}, you have a new chat from ${senderName || 'a colleague'}. Open app to read.`,
                  userName: recipientEmployee.name,
                  messageType: 'new_chat_message'
                }
              });

              // Mark SMS as sent
              await supabase
                .from('messages')
                .update({ 
                  sms_notification_sent: true,
                  sms_notification_sent_at: new Date().toISOString()
                })
                .eq('id', newMessage.id);
            }
          }
        }
      }

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

  // Set up real-time subscription - CRITICAL: This must work!
  useEffect(() => {
    console.log('🔥🔥🔥 SETTING UP REALTIME SUBSCRIPTION NOW!');
    
    const messageChannel = supabase
      .channel('messages-changes-' + Date.now()) // Unique channel name
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('🎉🎉🎉 NEW MESSAGE INSERT DETECTED!', payload);
          const newMessage = payload.new as Message;
          console.log('Message content:', newMessage.content);
          console.log('Message sender:', newMessage.sender_id);
          
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          
          // Only show popup if message is NOT from current user
          if (user && newMessage.sender_id === user.id) {
            console.log('⏭️ Skipping popup - message is from current user');
            return;
          }
          
          // Update messages state
          setMessages(prev => {
            const filtered = prev.filter(m => !m.id.startsWith('temp-'));
            if (!filtered.find(m => m.id === newMessage.id)) {
              return [...filtered, newMessage];
            }
            return filtered;
          });
          
          console.log('🔔 Preparing to show toast notification...');
          
          // Fetch sender info
          const { data: senderEmployee } = await supabase
            .from('employees')
            .select('name')
            .eq('auth_user_id', newMessage.sender_id)
            .single();
          
          console.log('👤 Sender data fetched:', senderEmployee);
          
          const senderName = senderEmployee?.name || 'Someone';
          const messagePreview = newMessage.content?.length > 50 
            ? newMessage.content.substring(0, 50) + '...'
            : newMessage.content || '📎 Attachment';
          
          console.log('📢 Calling toast NOW with:', { senderName, messagePreview });
          
          // Play notification sound
          try {
            console.log('🔊 Attempting to play notification sound...');
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 1.0; // Set volume to 100%
            audio.play()
              .then(() => console.log('✅ Notification sound played successfully!'))
              .catch(err => console.error('❌ Could not play notification sound:', err));
          } catch (err) {
            console.error('❌ Error creating audio element:', err);
          }
          
          // Call toast directly
          toast({
            title: `💬 New message from ${senderName}`,
            description: messagePreview,
            duration: 15000,
          });
          
          console.log('✅ Toast called successfully!');
          
          // Update unread count
          setUnreadCount(prev => {
            console.log('Updating unread count from', prev, 'to', prev + 1);
            return prev + 1;
          });
          
          // Refresh conversations
          setTimeout(() => {
            console.log('Refreshing conversations...');
            fetchConversations();
          }, 100);
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
          setMessages(prev => prev.map(m => 
            m.id === updatedMessage.id ? updatedMessage : m
          ));
        }
      )
      .subscribe((status) => {
        console.log('🌟 SUBSCRIPTION STATUS CHANGED:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅✅✅ SUCCESSFULLY SUBSCRIBED TO REALTIME MESSAGES!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ SUBSCRIPTION ERROR!');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ SUBSCRIPTION TIMED OUT!');
        }
      });

    console.log('📡 Subscription setup complete, channel created:', messageChannel);

    return () => {
      console.log('🧹 Cleaning up messages subscription');
      supabase.removeChannel(messageChannel);
    };
  }, []); // Empty deps - only run once!

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