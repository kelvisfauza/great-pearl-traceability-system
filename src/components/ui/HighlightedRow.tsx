import { ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface HighlightedRowProps {
  id: string;
  isHighlighted: boolean;
  children: ReactNode;
  className?: string;
  as?: 'tr' | 'div';
}

export const HighlightedRow = ({
  id,
  isHighlighted,
  children,
  className,
  as = 'div'
}: HighlightedRowProps) => {
  const ref = useRef<HTMLDivElement | HTMLTableRowElement>(null);

  useEffect(() => {
    if (isHighlighted && ref.current) {
      // Scroll into view
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [isHighlighted]);

  const highlightClasses = isHighlighted
    ? 'ring-2 ring-primary ring-offset-2 bg-primary/10 animate-pulse-highlight'
    : '';

  if (as === 'tr') {
    return (
      <tr
        ref={ref as React.RefObject<HTMLTableRowElement>}
        id={`row-${id}`}
        className={cn(highlightClasses, className)}
      >
        {children}
      </tr>
    );
  }

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      id={`row-${id}`}
      className={cn('transition-all duration-300', highlightClasses, className)}
    >
      {children}
    </div>
  );
};
