import { GraduationCap, RotateCcw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTraineeMode } from '@/hooks/useTraineeMode';
import { openTraineeTour } from './TraineeTour';
import { TOUR_DEPARTMENTS } from './curriculum';

/** Header control for trainees: resume, restart or jump to a department. */
export function TrainingGuideButton({ compact = false }: { compact?: boolean }) {
  const trainee = useTraineeMode();
  if (!trainee) return null;

  return (
    <div data-trainee-ui="true">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={compact ? 'icon' : 'sm'} className="gap-2" aria-label="Training Guide">
            <GraduationCap className="h-4 w-4" />
            {!compact && <span>Training Guide</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" data-trainee-ui="true">
          <DropdownMenuLabel>Guided tour</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => openTraineeTour()}>
            <Play className="h-4 w-4 mr-2" /> Resume tour
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openTraineeTour({ restart: true, step: 0 })}>
            <RotateCcw className="h-4 w-4 mr-2" /> Restart from the beginning
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Jump to department</DropdownMenuLabel>
          {TOUR_DEPARTMENTS.map((d) => (
            <DropdownMenuItem key={d} onSelect={() => openTraineeTour({ department: d })}>
              {d}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default TrainingGuideButton;
