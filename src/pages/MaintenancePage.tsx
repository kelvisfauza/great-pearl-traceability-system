import { Construction, Wrench, Clock } from 'lucide-react';

const MaintenancePage = ({ reason }: { reason?: string | null }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-primary/20 rounded-full">
            <Construction className="h-12 w-12 text-primary animate-pulse" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            System Under Maintenance
          </h1>
          <p className="text-muted-foreground text-lg">
            {reason || 'We are currently performing scheduled maintenance to improve the system.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>Updates in progress</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Please check back soon</span>
          </div>
        </div>

        <div className="pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Great Pearl Coffee Traceability System
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
