
import { useState, useEffect } from "react";
import Navigation from "./Navigation";
import MessagingPanel from "./messaging/MessagingPanel";
import MessageButton from "./messaging/MessageButton";
import NotificationButton from "./notifications/NotificationButton";
import { AccountButton } from "./AccountButton";
import NotificationPanel from "./notifications/NotificationPanel";
import { ThemeToggle } from "./ThemeToggle";
import { useMessages } from "@/hooks/useMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import FeatureAnnouncementModal from "./FeatureAnnouncementModal";
import AnnouncementDialog from "./notifications/AnnouncementDialog";
import TrainingTour from "./training/TrainingTour";

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
  const { unreadCount } = useMessages();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { user } = useAuth();
  usePresence(user?.id);
  
  console.log('Layout - notification unread count:', notificationUnreadCount);
  console.log('Layout - user:', user);

  const toggleMessaging = () => setIsMessagingOpen(!isMessagingOpen);
  const toggleNotifications = () => setIsNotificationOpen(!isNotificationOpen);

  const handleOpenAnnouncement = () => {
    toggleNotifications();
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-background border border-border rounded-md p-2 shadow-sm"
        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop hover trigger area */}
      <div 
        className="fixed left-0 top-0 w-4 h-full z-50 hidden md:block"
        onMouseEnter={() => setIsSidebarVisible(true)}
      />
      
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full w-56 xs:w-64 z-40 bg-background border-r border-border overflow-y-auto mobile-scroll transition-transform duration-300 ease-in-out ${
          isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseLeave={() => window.innerWidth >= 768 && setIsSidebarVisible(false)}
      >
        <Navigation />
      </aside>
      
      {/* Overlay when sidebar is visible */}
      {isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-30 md:hidden"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}
      
      <main className="flex-1 min-w-0 w-full">
        <div className="p-2 xs:p-3 md:p-4 lg:p-6 max-w-full">
          {title && (
            <div className="mb-3 xs:mb-4 md:mb-6">
              <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start gap-2 xs:gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg xs:text-xl md:text-2xl font-bold text-foreground truncate">{title}</h1>
                  {subtitle && <p className="text-muted-foreground mt-1 text-xs xs:text-sm">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-1 xs:gap-2 flex-shrink-0">
                  <AccountButton />
                  <NotificationButton
                    onToggle={toggleNotifications}
                    unreadCount={notificationUnreadCount}
                  />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          )}
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {showMessageButton && (
        <MessageButton 
          onToggleMessaging={toggleMessaging}
          unreadCount={unreadCount}
        />
      )}
      
      <MessagingPanel 
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
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
