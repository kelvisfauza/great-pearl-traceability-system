import { Settings, Clock } from 'lucide-react';

const MaintenancePage = ({ reason, expectedBackOnline }: { reason?: string | null; expectedBackOnline?: string | null }) => {
  const formattedBack = expectedBackOnline
    ? new Date(expectedBackOnline).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'hsl(var(--maintenance-bg))' }}
    >
      <div
        className="relative w-full max-w-xl text-center px-8 py-14 md:px-16 md:py-20"
        style={{
          backgroundColor: 'hsl(var(--maintenance-card))',
          border: '1px solid hsl(var(--maintenance-card-border))',
        }}
      >
        {/* Corner accents — subtle frame markers */}
        <span className="absolute top-0 left-0 w-8 h-px" style={{ backgroundColor: 'hsl(var(--maintenance-card-border))' }} />
        <span className="absolute top-0 left-0 w-px h-8" style={{ backgroundColor: 'hsl(var(--maintenance-card-border))' }} />
        <span className="absolute top-0 right-0 w-8 h-px" style={{ backgroundColor: 'hsl(var(--maintenance-card-border))' }} />
        <span className="absolute top-0 right-0 w-px h-8" style={{ backgroundColor: 'hsl(var(--maintenance-card-border))' }} />
        <span className="absolute bottom-0 left-0 w-8 h-px" style={{ backgroundColor: 'hsl(var(--maintenance-card-border))' }} />
        <span className="absolute bottom-0 left-0 w-px h-8" style={{ backgroundColor: 'hsl(var(--maintenance-card-border))' }} />
        <span className="absolute bottom-0 right-0 w-8 h-px" style={{ backgroundColor: 'hsl(var(--maintenance-card-border))' }} />
        <span className="absolute bottom-0 right-0 w-px h-8" style={{ backgroundColor: 'hsl(var(--maintenance-card-border))' }} />

        {/* Small top label */}
        <p
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-8"
          style={{ color: 'hsl(var(--maintenance-muted))' }}
        >
          Maintenance
        </p>

        {/* Gear icon */}
        <div className="mx-auto mb-6 flex items-center justify-center">
          <Settings
            className="w-16 h-16"
            style={{ color: 'hsl(var(--maintenance-accent))' }}
            strokeWidth={1.5}
          />
        </div>

        {/* Heading */}
        <h1
          className="text-4xl md:text-5xl font-bold mb-6"
          style={{ color: 'hsl(var(--maintenance-text))' }}
        >
          System Maintenance
        </h1>

        {/* Accent divider */}
        <div
          className="w-24 h-1 mx-auto mb-8"
          style={{ backgroundColor: 'hsl(var(--maintenance-accent))' }}
        />

        {/* Body copy */}
        <div className="space-y-5 text-base md:text-lg leading-relaxed" style={{ color: 'hsl(var(--maintenance-muted))' }}>
          <p>
            {reason || 'We are currently performing scheduled maintenance to improve the platform. We appreciate your patience while we work to serve you better.'}
          </p>

          {formattedBack && (
            <p>
              Expected back online:{' '}
              <span className="font-semibold" style={{ color: 'hsl(var(--maintenance-accent))' }}>
                <Clock className="inline w-4 h-4 mr-1 mb-0.5" />
                {formattedBack}
              </span>
            </p>
          )}

          <p>We apologize for any inconvenience this may cause.</p>

          <p>
            Please contact us at{' '}
            <a
              href="mailto:support@greatpearlcoffee.com"
              className="font-semibold hover:underline"
              style={{ color: 'hsl(var(--maintenance-accent))' }}
            >
              support@greatpearlcoffee.com
            </a>{' '}
            for any urgent issues or concerns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
