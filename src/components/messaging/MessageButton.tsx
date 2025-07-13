import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MessagingPanel from "./MessagingPanel";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

const MessageButton = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Use Firebase User.uid instead of .id
  const { unreadCount } = useMessages(user?.uid);

  const handleClick = () => {
    setIsOpen(true);
  };

  if (!user) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="relative"
      >
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
      
      {isOpen && (
        <MessagingPanel 
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentUserId={user.uid}
        />
      )}
    </>
  );
};

export default MessageButton;
