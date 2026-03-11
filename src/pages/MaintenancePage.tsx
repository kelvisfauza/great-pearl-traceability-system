import { Construction, Wrench, Clock, ShieldCheck } from 'lucide-react';

const MaintenancePage = ({ reason }: { reason?: string | null }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle animated background circles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-border/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-border/20" />
      </div>

      <div className="max-w-lg w-full text-center space-y-8 relative z-10">
        {/* Icon with layered rings */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-primary/10" />
          <div className="absolute inset-4 bg-primary/10 rounded-full" />
          <div className="relative flex items-center justify-center w-28 h-28">
            <Construction className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            System Under Maintenance
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
            {reason || 'We are currently performing scheduled maintenance to improve the system. We\'ll be back shortly.'}
          </p>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border">
            <Wrench className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Updating</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Securing</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Soon</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-xs mx-auto space-y-2">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full rounded-full bg-primary/60"
              style={{
                animation: 'progress 3s ease-in-out infinite',
                width: '60%',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Maintenance in progress…</p>
        </div>

        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            Great Agro Coffee Traceability System
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0%, 100% { width: 20%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
