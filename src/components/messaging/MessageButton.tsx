
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import MessagingPanel from "./MessagingPanel";
import { useMessages } from "@/hooks/useMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MessageButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { conversations } = useMessages();
  const { user } = useAuth();

  // Calculate unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      if (!user || !conversations) return 0;
      
      let totalUnread = 0;
      
      for (const conversation of conversations) {
        // Get the participant record for this user to check last_read_at
        const { data: participant } = await supabase
          .from("conversation_participants")
          .select("last_read_at")
          .eq("conversation_id", conversation.id)
          .eq("user_id", user.id)
          .single();

        if (participant) {
          // Count messages after last_read_at
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversation.id)
            .neq("sender_id", user.id) // Don't count own messages
            .gt("created_at", participant.last_read_at || "1970-01-01");

          totalUnread += count || 0;
        }
      }
      
      return totalUnread;
    },
    enabled: !!user && !!conversations,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Messages
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {isOpen && <MessagingPanel onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default MessageButton;
