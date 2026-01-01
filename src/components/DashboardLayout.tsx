import { useState } from "react";
import AppSidebar from "./AppSidebar";
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
import TrainingTour from "./training/TrainingTour";
import ForceEmailUpdate from "./auth/ForceEmailUpdate";
import MobileNavigation from "./MobileNavigation";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";

const COMPANY_DOMAIN = "@greatpearlcoffee.com";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showMessageButton?: boolean;
}

const DashboardLayout = ({ children, title, subtitle, showMessageButton = true }: DashboardLayoutProps) => {
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const messagesData = useMessages();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { user, employee } = useAuth();
  const isMobile = useIsMobile();
  usePresence(user?.id);

  // Check if user needs to update email to company domain
  const email = user?.email?.toLowerCase() || "";
  const needsEmailUpdate = email && !email.endsWith(COMPANY_DOMAIN) && employee?.role !== 'Super Admin';

  const toggleMessaging = () => setIsMessagingOpen(!isMessagingOpen);
  const toggleNotifications = () => setIsNotificationOpen(!isNotificationOpen);

  const handleOpenAnnouncement = () => {
    toggleNotifications();
  };

  if (needsEmailUpdate) {
    return <ForceEmailUpdate />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Navigation Drawer */}
      <MobileNavigation isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      {/* Desktop Sidebar */}
      {!isMobile && (
        <AppSidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border flex items-center justify-between px-4 md:px-6 print:hidden">
          <div className="flex items-center gap-4 min-w-0">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setIsMobileNavOpen(true)} className="flex-shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            )}
            {title && (
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">{title}</h1>
                {subtitle && !isMobile && (
                  <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <GlobalSearch />
            {showMessageButton && !isMobile && (
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
            {!isMobile && <AccountButton />}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 print:p-0">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Bar */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border print:hidden">
            <div className="flex items-center justify-around px-4 py-3">
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
      </div>

      {/* Panels */}
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

export default DashboardLayout;
