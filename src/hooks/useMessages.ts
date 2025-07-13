
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
      
      // Get unique conversations
      const uniqueConversations = data?.map(item => item.conversations) || [];
      
      // For each conversation, get participant details
      const enhancedConversations = await Promise.all(
        uniqueConversations.map(async (conv) => {
          if (conv.type === "direct" && !conv.name) {
            // Get the other participant for direct messages
            const { data: participants } = await supabase
              .from("conversation_participants")
              .select("user_id")
              .eq("conversation_id", conv.id)
              .neq("user_id", user.id);

            if (participants && participants.length > 0) {
              // Get employee details for the other participant by finding their auth user
              const { data: employeeData } = await supabase
                .from("employees")
                .select("name")
                .eq("email", (await supabase.auth.admin.getUserById(participants[0].user_id)).data.user?.email || "")
                .maybeSingle();

              if (employeeData) {
                return {
                  ...conv,
                  name: employeeData.name,
                  participantName: employeeData.name
                };
              }
            }
            
            return {
              ...conv,
              name: "Direct Message",
              participantName: null
            };
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
          *
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
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
    mutationFn: async ({ participantEmployeeIds, name, type = "direct" }: {
      participantEmployeeIds: string[];
      name?: string;
      type?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Get employee details and find users with matching emails
      const { data: employees, error: employeeError } = await supabase
        .from("employees")
        .select("id, email")
        .in("id", participantEmployeeIds);

      if (employeeError) throw employeeError;
      if (!employees || employees.length === 0) {
        throw new Error("Selected employees not found");
      }

      // For now, we'll create conversations but note that proper user mapping needs to be implemented
      // This is a simplified version that creates conversations with the current user
      const participantUserIds = [user.id]; // Only current user for now

      // Check if direct conversation already exists
      if (type === "direct" && participantEmployeeIds.length === 1) {
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
              // For now, return existing conversation
              return convParticipant.conversations;
            }
          }
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          name: name || employees[0]?.email || "Direct Message",
          type,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants (current user)
      const participantData = participantUserIds.map(userId => ({
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
