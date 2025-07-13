
import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Navigation from "./Navigation";
import SecurityAlert from "./SecurityAlert";
import MessagingPanel from "./messaging/MessagingPanel";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { useMessages } from "@/hooks/useMessages";

const Layout = () => {
  const { user, employee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMessaging, setShowMessaging] = useState(false);

  // Use Firebase User.uid instead of .id
  usePresence(user?.uid);
  const { unreadCount } = useMessages(user?.uid);

  useEffect(() => {
    if (!user && location.pathname !== '/auth') {
      navigate('/auth');
    } else if (user && location.pathname === '/auth') {
      navigate('/');
    }
  }, [user, navigate, location]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <SecurityAlert />
        <Outlet />
      </main>
      {showMessaging && (
        <MessagingPanel 
          isOpen={showMessaging}
          onClose={() => setShowMessaging(false)}
          currentUserId={user.uid}
        />
      )}
      <Toaster />
      <Sonner />
    </div>
  );
};

export default Layout;
