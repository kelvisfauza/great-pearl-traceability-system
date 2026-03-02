import React, { createContext, useContext } from "react";
import { useActiveLeave, ActiveLeave } from "@/hooks/useActiveLeave";

interface LeaveEnforcementContextType {
  activeLeave: ActiveLeave | null;
  isOnLeave: boolean;
  isLoading: boolean;
}

const LeaveEnforcementContext = createContext<LeaveEnforcementContextType>({
  activeLeave: null,
  isOnLeave: false,
  isLoading: false,
});

export const LeaveEnforcementProvider = ({ children }: { children: React.ReactNode }) => {
  const { activeLeave, isLoading } = useActiveLeave();

  return (
    <LeaveEnforcementContext.Provider value={{ activeLeave, isOnLeave: !!activeLeave, isLoading }}>
      {children}
    </LeaveEnforcementContext.Provider>
  );
};

export const useLeaveEnforcement = () => useContext(LeaveEnforcementContext);
