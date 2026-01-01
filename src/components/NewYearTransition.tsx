import React, { useState, useEffect } from 'react';

interface NewYearTransitionProps {
  onComplete?: () => void;
}

export const NewYearTransition: React.FC<NewYearTransitionProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'old' | 'transition' | 'new' | 'done'>('old');

  useEffect(() => {
    // Phase 1: Show 2025 (1s)
    const timer1 = setTimeout(() => setPhase('transition'), 1000);
    // Phase 2: Transition effect (1s)
    const timer2 = setTimeout(() => setPhase('new'), 2000);
    // Phase 3: Show 2026 (1.5s) then complete
    const timer3 = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 overflow-hidden">
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative text-center">
        {/* 2025 - Fading out */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${
            phase === 'old' 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-50 -translate-y-20'
          }`}
        >
          <span className="text-2xl text-gray-400 mb-2">Goodbye</span>
          <span className="text-8xl md:text-9xl font-bold bg-gradient-to-b from-gray-400 to-gray-600 bg-clip-text text-transparent">
            2025
          </span>
          <span className="text-xl text-gray-500 mt-4">✨ Thank you for the memories ✨</span>
        </div>

        {/* Transition sparkles */}
        {phase === 'transition' && (
          <div className="flex items-center justify-center">
            <span className="text-6xl animate-bounce">🎆</span>
            <span className="text-8xl animate-ping mx-4">✨</span>
            <span className="text-6xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎇</span>
          </div>
        )}

        {/* 2026 - Fading in */}
        <div
          className={`flex flex-col items-center justify-center transition-all duration-1000 ${
            phase === 'new' 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-150 translate-y-20'
          }`}
        >
          <span className="text-2xl text-yellow-300 mb-2 animate-pulse">Welcome</span>
          <span className="text-8xl md:text-9xl font-bold bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent animate-pulse">
            2026
          </span>
          <span className="text-xl text-yellow-200 mt-4">🎉 Happy New Year! 🎉</span>
          <div className="flex gap-2 mt-4 text-3xl">
            <span className="animate-bounce">🥳</span>
            <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>🎊</span>
            <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🎆</span>
            <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>🎇</span>
            <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>🥳</span>
          </div>
        </div>
      </div>
    </div>
  );
};
