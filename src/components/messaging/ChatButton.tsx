import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

const ChatButton = ({ onClick, unreadCount = 0 }: ChatButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative hover:bg-accent"
      aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <MessageSquare className={`h-5 w-5 ${unreadCount > 0 ? 'text-primary animate-pulse' : ''}`} />
      {unreadCount > 0 && (
        <>
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold animate-bounce z-10"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full animate-ping opacity-75"></span>
        </>
      )}
    </Button>
  );
};

export default ChatButton;