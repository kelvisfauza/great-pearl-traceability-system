import { useState } from "react";
import RoleBasedNavigation from "./RoleBasedNavigation";
import MessagingPanel from "./messaging/MessagingPanel";
import MessageButton from "./messaging/MessageButton";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const { user, employee } = useAuth();
  
  // Remove useMessages from Layout to prevent React queue issues

  const toggleMessaging = () => setIsMessagingOpen(!isMessagingOpen);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="fixed left-0 top-0 h-full w-64 z-30 bg-white border-r border-gray-200 overflow-y-auto">
        <RoleBasedNavigation />
      </aside>
      
      <main className="flex-1 ml-64 min-w-0">
        <div className="p-6 max-w-full">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-gray-600 mt-1 text-sm">{subtitle}</p>}
            </div>
          )}
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      <MessageButton 
        onToggleMessaging={toggleMessaging}
        unreadCount={0} // Simplified for now to fix React queue issue
      />
      
      <MessagingPanel 
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
      />
    </div>
  );
};

export default Layout;