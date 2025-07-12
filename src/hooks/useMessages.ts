
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch conversations for current user with participant details
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations!inner (
            id,
            name,
            type,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Get unique conversations and enhance with participant info
      const uniqueConversations = data?.map(item => item.conversations) || [];
      
      // For direct messages, fetch the other participant's name
      const enhancedConversations = await Promise.all(
        uniqueConversations.map(async (conv) => {
          if (conv.type === "direct" && !conv.name) {
            // Get the other participant through user_profiles -> employees
            const { data: otherParticipant } = await supabase
              .from("conversation_participants")
              .select(`
                user_id,
                user_profiles!inner (
                  employee_id,
                  employees!inner (
                    name,
                    position
                  )
                )
              `)
              .eq("conversation_id", conv.id)
              .neq("user_id", user.id)
              .single();

            if (otherParticipant?.user_profiles?.employees) {
              const employeeData = otherParticipant.user_profiles.employees;
              return {
                ...conv,
                name: employeeData.name,
                participant_info: employeeData
              };
            }
          }
          return conv;
        })
      );
      
      return enhancedConversations;
    },
    enabled: !!user,
  });

  // Fetch messages for a specific conversation
  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey (
            employees!inner (
              id,
              name,
              email
            )
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        // Fallback query without sender info if join fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      
      return data || [];
    },
    enabled: !!conversationId,
  });

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (!conversationId || !user) return;

    const markAsRead = async () => {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error marking messages as read:", error);
      }
    };

    // Mark as read after a short delay
    const timeout = setTimeout(markAsRead, 1000);
    return () => clearTimeout(timeout);
  }, [conversationId, user, messages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(["messages", conversationId], (old: any) => [
            ...(old || []),
            payload.new,
          ]);
          
          // Invalidate unread count
          queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ content, type = "text" }: { content: string; type?: string }) => {
      if (!user || !conversationId) throw new Error("User or conversation not found");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate unread count after sending
      queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
    }
  });

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async ({ participants, name, type = "direct" }: {
      participants: string[];
      name?: string;
      type?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Check if direct conversation already exists
      if (type === "direct" && participants.length === 1) {
        const { data: existingConv } = await supabase
          .from("conversation_participants")
          .select(`
            conversation_id,
            conversations!inner (
              id,
              type
            )
          `)
          .eq("user_id", user.id);

        if (existingConv) {
          for (const convParticipant of existingConv) {
            if (convParticipant.conversations.type === "direct") {
              // Check if this conversation has the target participant
              const { data: otherParticipants } = await supabase
                .from("conversation_participants")
                .select("user_id")
                .eq("conversation_id", convParticipant.conversation_id)
                .neq("user_id", user.id);

              if (otherParticipants && 
                  otherParticipants.length === 1 && 
                  otherParticipants[0].user_id === participants[0]) {
                // Conversation already exists
                return convParticipant.conversations;
              }
            }
          }
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          name,
          type,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const participantData = [user.id, ...participants].map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
      }));

      const { error: participantError } = await supabase
        .from("conversation_participants")
        .insert(participantData);

      if (participantError) throw participantError;

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      return conversation;
    },
  });

  return {
    conversations,
    messages,
    sendMessage,
    createConversation,
  };
};
