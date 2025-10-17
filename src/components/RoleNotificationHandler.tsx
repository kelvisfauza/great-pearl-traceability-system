import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import RolePromotionModal from './RolePromotionModal';

const RoleNotificationHandler = () => {
  const { employee, user } = useAuth();
  const [showPromotion, setShowPromotion] = useState(false);
  const [checkedForPromotion, setCheckedForPromotion] = useState(false);

  useEffect(() => {
    // Only check once when employee data is available
    if (!employee || !user || checkedForPromotion) return;
    if (!employee.authUserId) return; // Skip if no auth user

    const checkForRolePromotion = async () => {
      try {
        console.log('🔔 Checking for role promotion...', {
          currentRole: employee.role,
          lastNotifiedRole: employee.last_notified_role
        });

        // Check if the user's role has changed since last notification
        const hasNewRole = employee.last_notified_role !== employee.role;
        
        // Also skip if user is just "User" role and hasn't been notified before
        // (we only show promotion, not demotion or initial role)
        const isPromotionWorthy = employee.role !== 'User' || employee.last_notified_role;

        if (hasNewRole && isPromotionWorthy) {
          console.log('🎉 New role detected! Showing promotion notification');
          setShowPromotion(true);
        }
      } catch (error) {
        console.error('Error checking role promotion:', error);
      } finally {
        setCheckedForPromotion(true);
      }
    };

    // Small delay to ensure UI is ready
    const timer = setTimeout(() => {
      checkForRolePromotion();
    }, 1000);

    return () => clearTimeout(timer);
  }, [employee, user, checkedForPromotion]);

  const handleClosePromotion = async () => {
    if (!employee || !employee.id) return;

    // Close modal and mark as checked immediately to prevent re-triggering
    setShowPromotion(false);
    setCheckedForPromotion(true);

    try {
      // Mark this role as notified in the background
      await supabase
        .from('employees')
        .update({
          last_notified_role: employee.role,
          role_notification_shown_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      console.log('✅ Role notification marked as shown');
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  if (!employee || !showPromotion) return null;

  return (
    <RolePromotionModal
      open={showPromotion}
      userName={employee.name}
      newRole={employee.role}
      onClose={handleClosePromotion}
    />
  );
};

export default RoleNotificationHandler;
