import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ActiveLeave } from "@/hooks/useActiveLeave";

interface LeaveEnforcementBannerProps {
  activeLeave: ActiveLeave;
}

const LeaveEnforcementBanner = ({ activeLeave }: LeaveEnforcementBannerProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-md">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>
        You are on <strong>{activeLeave.leave_type}</strong> ({format(new Date(activeLeave.start_date), "dd MMM")} – {format(new Date(activeLeave.end_date), "dd MMM yyyy")}). 
        The system is in <strong>read-only mode</strong> — you cannot create, edit, or approve anything until your leave ends.
      </span>
    </div>
  );
};

export default LeaveEnforcementBanner;
