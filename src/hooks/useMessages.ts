
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch conversations for current user
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
      return data?.map(item => item.conversations) || [];
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
          sender:sender_id (
            id,
            email
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

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
  });

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async ({ participants, name, type = "direct" }: {
      participants: string[];
      name?: string;
      type?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

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
