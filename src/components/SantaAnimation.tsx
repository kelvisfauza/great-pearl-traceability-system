import React from 'react';
import santaSleigh from '@/assets/santa-sleigh.png';
import santaWalking from '@/assets/santa-walking.png';

export const SantaAnimation = () => {
  const isChristmasPeriod = new Date() < new Date('2026-01-01');
  
  if (!isChristmasPeriod) return null;

  return (
    <>
      {/* Santa on sleigh flying across screen */}
      <div 
        className="fixed pointer-events-none z-30 animate-santa-fly" 
        style={{ top: '8%' }}
      >
        <img 
          src={santaSleigh} 
          alt="Santa on sleigh" 
          className="h-20 w-auto object-contain opacity-90"
          style={{ 
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
            mixBlendMode: 'multiply'
          }}
        />
      </div>

      {/* Second sleigh going opposite direction */}
      <div 
        className="fixed pointer-events-none z-30 animate-santa-fly-reverse" 
        style={{ top: '45%' }}
      >
        <img 
          src={santaSleigh} 
          alt="Santa on sleigh" 
          className="h-16 w-auto object-contain opacity-70"
          style={{ 
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
            transform: 'scaleX(-1)',
            mixBlendMode: 'multiply'
          }}
        />
      </div>

      {/* Walking Santa at bottom - smaller and more subtle */}
      <div className="fixed bottom-2 pointer-events-none z-30 animate-santa-walk">
        <img 
          src={santaWalking} 
          alt="Santa walking" 
          className="h-24 w-auto object-contain opacity-85"
          style={{ 
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
            animation: 'santa-bob 0.5s ease-in-out infinite',
            mixBlendMode: 'multiply'
          }}
        />
      </div>

      {/* Falling gifts - smaller */}
      <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={`gift-${i}`}
            className="absolute animate-gift-fall opacity-70"
            style={{
              left: `${15 + i * 22}%`,
              animationDelay: `${i * 5}s`,
              animationDuration: `${14 + i * 2}s`,
            }}
          >
            <div className="text-2xl">🎁</div>
          </div>
        ))}
      </div>
    </>
  );
};

export default SantaAnimation;
