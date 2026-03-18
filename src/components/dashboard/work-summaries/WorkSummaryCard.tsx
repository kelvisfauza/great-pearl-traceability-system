import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface WorkItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  link?: string;
  urgent?: boolean;
}

interface WorkSummaryCardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  items: WorkItem[];
}

const WorkSummaryCard = ({ title, icon: TitleIcon, color, items }: WorkSummaryCardProps) => {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <TitleIcon className={`h-4 w-4 ${color}`} />
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                onClick={() => item.link && navigate(item.link)}
                className={`flex items-center gap-3 p-3 rounded-lg ${item.bgColor} ${item.link ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${item.color}`} />
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">
                    {item.value}
                    {item.urgent && Number(item.value) > 0 && (
                      <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">!</Badge>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkSummaryCard;
