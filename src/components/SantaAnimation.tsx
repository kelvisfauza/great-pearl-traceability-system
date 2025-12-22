import React from 'react';

export const SantaAnimation = () => {
  const isChristmasPeriod = new Date() < new Date('2026-01-01');
  
  if (!isChristmasPeriod) return null;

  return (
    <>
      {/* Santa with sleigh moving across screen */}
      <div className="fixed pointer-events-none z-50 animate-santa-fly" style={{ top: '15%' }}>
        <div className="flex items-center gap-1">
          <span className="text-4xl">🎁</span>
          <span className="text-5xl">🛷</span>
          <span className="text-4xl transform -scale-x-100">🎅</span>
          <span className="text-3xl">🦌</span>
          <span className="text-3xl">🦌</span>
          <span className="text-2xl">🦌</span>
        </div>
      </div>

      {/* Second Santa going opposite direction */}
      <div className="fixed pointer-events-none z-50 animate-santa-fly-reverse" style={{ top: '60%' }}>
        <div className="flex items-center gap-1">
          <span className="text-2xl">🦌</span>
          <span className="text-3xl">🦌</span>
          <span className="text-3xl">🦌</span>
          <span className="text-4xl">🎅</span>
          <span className="text-5xl transform -scale-x-100">🛷</span>
          <span className="text-4xl">🎁</span>
        </div>
      </div>

      {/* Falling gifts */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={`gift-${i}`}
            className="absolute animate-gift-fall"
            style={{
              left: `${15 + i * 15}%`,
              animationDelay: `${i * 3}s`,
              animationDuration: `${8 + i * 2}s`,
            }}
          >
            <span className="text-3xl">{i % 2 === 0 ? '🎁' : '🎀'}</span>
          </div>
        ))}
      </div>

      {/* Walking Santa at bottom */}
      <div className="fixed bottom-4 pointer-events-none z-50 animate-santa-walk">
        <div className="flex items-end gap-2">
          <span className="text-5xl animate-bounce" style={{ animationDuration: '0.5s' }}>🎅</span>
          <span className="text-3xl">🎄</span>
          <span className="text-2xl">🎁</span>
          <span className="text-2xl">🎁</span>
          <span className="text-2xl">🎁</span>
        </div>
      </div>
    </>
  );
};

export default SantaAnimation;
