import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

interface NotificationButtonProps {
  onToggle: () => void;
  unreadCount: number;
}

const NotificationButton = ({ onToggle, unreadCount }: NotificationButtonProps) => {
  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      size="sm"
      className="relative"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

export default NotificationButton;