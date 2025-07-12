
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import MessagingPanel from "./MessagingPanel";
import { useMessages } from "@/hooks/useMessages";

const MessageButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { conversations } = useMessages();

  // Calculate unread messages count (simplified)
  const unreadCount = 0; // This would be calculated based on last_read_at vs message timestamps

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
