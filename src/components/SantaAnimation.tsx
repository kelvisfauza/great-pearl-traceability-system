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
        className="fixed pointer-events-none z-50 animate-santa-fly" 
        style={{ top: '10%' }}
      >
        <img 
          src={santaSleigh} 
          alt="Santa on sleigh" 
          className="h-32 w-auto object-contain drop-shadow-2xl"
          style={{ 
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
          }}
        />
      </div>

      {/* Second sleigh going opposite direction higher up */}
      <div 
        className="fixed pointer-events-none z-50 animate-santa-fly-reverse" 
        style={{ top: '50%' }}
      >
        <img 
          src={santaSleigh} 
          alt="Santa on sleigh" 
          className="h-24 w-auto object-contain opacity-80"
          style={{ 
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
            transform: 'scaleX(-1)'
          }}
        />
      </div>

      {/* Walking Santa at bottom */}
      <div className="fixed bottom-0 pointer-events-none z-50 animate-santa-walk">
        <img 
          src={santaWalking} 
          alt="Santa walking" 
          className="h-40 w-auto object-contain"
          style={{ 
            filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.3))',
            animation: 'santa-bob 0.5s ease-in-out infinite'
          }}
        />
      </div>

      {/* Falling gifts */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={`gift-${i}`}
            className="absolute animate-gift-fall"
            style={{
              left: `${10 + i * 20}%`,
              animationDelay: `${i * 4}s`,
              animationDuration: `${12 + i * 2}s`,
            }}
          >
            <div className="text-4xl">🎁</div>
          </div>
        ))}
      </div>
    </>
  );
};

export default SantaAnimation;
