
import { useState } from "react";
import Navigation from "./Navigation";
import MobileNavigation from "./MobileNavigation";
import MessagingPanel from "./messaging/MessagingPanel";
import ChatButton from "./messaging/ChatButton";
import NotificationButton from "./notifications/NotificationButton";
import { AccountButton } from "./AccountButton";
import NotificationPanel from "./notifications/NotificationPanel";
import { ThemeToggle } from "./ThemeToggle";
import GlobalSearch from "./GlobalSearch";
import { useMessages } from "@/hooks/useMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { useIsMobile } from "@/hooks/use-mobile";
import FeatureAnnouncementModal from "./FeatureAnnouncementModal";
import AnnouncementDialog from "./notifications/AnnouncementDialog";
import TrainingTour from "./training/TrainingTour";
import ForceEmailUpdate from "./auth/ForceEmailUpdate";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";

const COMPANY_DOMAIN = "@greatpearlcoffee.com";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showMessageButton?: boolean;
}

const Layout = ({ children, title, subtitle, showMessageButton = true }: LayoutProps) => {
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const messagesData = useMessages();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  usePresence(user?.id);
  
  console.log('Layout - notification unread count:', notificationUnreadCount);
  console.log('Layout - user:', user);

  // Check if user needs to update email to company domain
  const email = user?.email?.toLowerCase() || "";
  const needsEmailUpdate = email && !email.endsWith(COMPANY_DOMAIN);

  const toggleMessaging = () => setIsMessagingOpen(!isMessagingOpen);
  const toggleNotifications = () => setIsNotificationOpen(!isNotificationOpen);

  const handleOpenAnnouncement = () => {
    toggleNotifications();
  };

  // Force email update screen if needed
  if (needsEmailUpdate) {
    return <ForceEmailUpdate />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      {/* Mobile Navigation Drawer */}
      <MobileNavigation isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      {/* Desktop Sidebar - hover trigger */}
      {!isMobile && (
        <>
          <div 
            className="fixed left-0 top-0 w-4 h-full z-50 print:hidden"
            onMouseEnter={() => setIsSidebarVisible(true)}
          />
          
          <aside 
            className={`fixed left-0 top-0 h-full w-64 z-40 bg-background border-r border-border overflow-y-auto transition-transform duration-300 ease-in-out print:hidden ${
              isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
            }`}
            onMouseLeave={() => setIsSidebarVisible(false)}
          >
            <Navigation />
          </aside>
        </>
      )}
      
      <main className="flex-1 min-w-0 w-full pb-16 md:pb-0">
        {/* Mobile Top Bar */}
        {isMobile && (
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border print:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Button variant="ghost" size="icon" onClick={() => setIsMobileNavOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              {title && (
                <h1 className="text-base font-semibold text-foreground truncate flex-1 mx-3">{title}</h1>
              )}
              <div className="flex items-center gap-1">
                <GlobalSearch />
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && title && (
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4 print:hidden">
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <AccountButton />
                <GlobalSearch />
                {showMessageButton && (
                  <ChatButton
                    onClick={toggleMessaging}
                    unreadCount={messagesData.unreadCount}
                  />
                )}
                <NotificationButton
                  onToggle={toggleNotifications}
                  unreadCount={notificationUnreadCount}
                />
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-3 md:p-6 print:p-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border print:hidden">
          <div className="flex items-center justify-around px-4 py-2">
            <AccountButton />
            {showMessageButton && (
              <ChatButton
                onClick={toggleMessaging}
                unreadCount={messagesData.unreadCount}
              />
            )}
            <NotificationButton
              onToggle={toggleNotifications}
              unreadCount={notificationUnreadCount}
            />
          </div>
        </div>
      )}

      <MessagingPanel 
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
        messagesData={messagesData}
      />
      
      <NotificationPanel 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
      
      <FeatureAnnouncementModal onOpenAnnouncement={handleOpenAnnouncement} />
      <TrainingTour />
    </div>
  );
};

export default Layout;
