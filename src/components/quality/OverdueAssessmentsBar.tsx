import { AlertTriangle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OVERDUE_DAYS, PendingLotLike, isOverdue, printOverdueAssessments } from "@/utils/overdueAssessments";

interface Props {
  lots: PendingLotLike[];
  overdueOnly: boolean;
  onToggle: (v: boolean) => void;
}

const OverdueAssessmentsBar = ({ lots, overdueOnly, onToggle }: Props) => {
  const count = lots.filter((l) => isOverdue(l)).length;
  return (
    <div className="mb-4 space-y-3">
      {count > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><b>{count}</b> lot{count === 1 ? "" : "s"} pending more than {OVERDUE_DAYS} days without assessment.</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!overdueOnly ? "default" : "outline"} onClick={() => onToggle(false)}>
          All pending ({lots.length})
        </Button>
        <Button size="sm" variant={overdueOnly ? "destructive" : "outline"} onClick={() => onToggle(true)}>
          Overdue only ({count})
        </Button>
        <Button size="sm" variant="outline" onClick={() => printOverdueAssessments(lots)} disabled={count === 0}>
          <Printer className="mr-2 h-4 w-4" /> Print overdue list
        </Button>
      </div>
    </div>
  );
};

export default OverdueAssessmentsBar;
