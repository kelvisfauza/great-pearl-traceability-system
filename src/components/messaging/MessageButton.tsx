
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

interface MessageButtonProps {
  onToggleMessaging: () => void;
  unreadCount: number;
}

const MessageButton = ({ onToggleMessaging, unreadCount }: MessageButtonProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onToggleMessaging}
        size="lg"
        className="relative rounded-full h-14 w-14 shadow-lg"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
};

export default MessageButton;
