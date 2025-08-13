
import { useState } from "react";
import Navigation from "./Navigation";
import MessagingPanel from "./messaging/MessagingPanel";
import MessageButton from "./messaging/MessageButton";
import NotificationButton from "./notifications/NotificationButton";
import NotificationPanel from "./notifications/NotificationPanel";
import { ThemeToggle } from "./ThemeToggle";
import { useMessages } from "@/hooks/useMessages";
import { useNotifications } from "@/hooks/useNotifications";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { unreadCount } = useMessages();
  const { unreadCount: notificationUnreadCount } = useNotifications();

  const toggleMessaging = () => setIsMessagingOpen(!isMessagingOpen);
  const toggleNotifications = () => setIsNotificationOpen(!isNotificationOpen);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="fixed left-0 top-0 h-full w-64 z-30 bg-white border-r border-gray-200 overflow-y-auto">
        <Navigation />
      </aside>
      
      <main className="flex-1 ml-64 min-w-0">
        <div className="p-6 max-w-full">
          {title && (
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-2">
                <NotificationButton 
                  onToggle={toggleNotifications}
                  unreadCount={notificationUnreadCount}
                />
                <ThemeToggle />
              </div>
            </div>
          )}
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      <MessageButton 
        onToggleMessaging={toggleMessaging}
        unreadCount={unreadCount}
      />
      
      <MessagingPanel 
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
      />
      
      <NotificationPanel 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </div>
  );
};

export default Layout;
