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
      className="relative hover-scale transition-all duration-200 hover:bg-primary/10"
    >
      <Bell className={`h-5 w-5 transition-colors ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium animate-pulse shadow-lg"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
      )}
    </Button>
  );
};

export default NotificationButton;