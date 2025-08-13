import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureAnnouncementModalProps {
  onOpenAnnouncement?: () => void;
}

const FeatureAnnouncementModal = ({ onOpenAnnouncement }: FeatureAnnouncementModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen this announcement before
    const hasSeenAnnouncement = localStorage.getItem('hasSeenNotificationFeature');
    if (!hasSeenAnnouncement) {
      // Show modal after a short delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenNotificationFeature', 'true');
  };

  const handleTryNow = () => {
    handleClose();
    if (onOpenAnnouncement) {
      onOpenAnnouncement();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-2">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            New Feature Alert! 🎉
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Did you notice our new feature? You can now send notifications and announcements through the notification system!
          </DialogDescription>
        </DialogHeader>

        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Send Notifications</h4>
                <p className="text-xs text-muted-foreground">Instantly notify team members</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Broadcast Announcements</h4>
                <p className="text-xs text-muted-foreground">Reach entire departments at once</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleTryNow}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Try It Now!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureAnnouncementModal;