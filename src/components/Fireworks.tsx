import { useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

interface Firework {
  id: number;
  x: number;
  y: number;
  targetY: number;
  exploded: boolean;
  particles: Particle[];
  color: string;
}

const COLORS = [
  '#ff0000', '#ff6600', '#ffff00', '#00ff00', 
  '#00ffff', '#0066ff', '#ff00ff', '#ff69b4',
  '#ffd700', '#00ff7f', '#ff1493', '#7b68ee'
];

export const Fireworks = () => {
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [nextId, setNextId] = useState(0);

  const createFirework = useCallback(() => {
    const x = Math.random() * 100;
    const targetY = 20 + Math.random() * 30;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    const newFirework: Firework = {
      id: nextId,
      x,
      y: 100,
      targetY,
      exploded: false,
      particles: [],
      color
    };
    
    setNextId(prev => prev + 1);
    setFireworks(prev => [...prev, newFirework]);
  }, [nextId]);

  const createParticles = (x: number, y: number, color: string): Particle[] => {
    const particles: Particle[] = [];
    const particleCount = 30 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;
      
      particles.push({
        id: i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.3 ? color : COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
        size: 2 + Math.random() * 3
      });
    }
    
    return particles;
  };

  // Launch fireworks periodically
  useEffect(() => {
    const launchInterval = setInterval(() => {
      if (Math.random() > 0.3) {
        createFirework();
      }
    }, 800);

    // Initial burst
    setTimeout(() => createFirework(), 100);
    setTimeout(() => createFirework(), 300);
    setTimeout(() => createFirework(), 600);

    return () => clearInterval(launchInterval);
  }, [createFirework]);

  // Animation loop
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setFireworks(prev => {
        return prev
          .map(fw => {
            if (!fw.exploded) {
              // Move firework upward
              const newY = fw.y - 1.5;
              
              if (newY <= fw.targetY) {
                // Explode!
                return {
                  ...fw,
                  y: newY,
                  exploded: true,
                  particles: createParticles(fw.x, newY, fw.color)
                };
              }
              
              return { ...fw, y: newY };
            } else {
              // Update particles
              const updatedParticles = fw.particles
                .map(p => ({
                  ...p,
                  x: p.x + p.vx * 0.3,
                  y: p.y + p.vy * 0.3 + 0.05, // gravity
                  vy: p.vy + 0.02, // gravity acceleration
                  life: p.life - 0.02
                }))
                .filter(p => p.life > 0);
              
              return { ...fw, particles: updatedParticles };
            }
          })
          .filter(fw => !fw.exploded || fw.particles.length > 0);
      });
    }, 16);

    return () => clearInterval(animationInterval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {fireworks.map(fw => (
        <div key={fw.id}>
          {/* Rocket trail */}
          {!fw.exploded && (
            <div
              className="absolute w-1 h-4 rounded-full"
              style={{
                left: `${fw.x}%`,
                top: `${fw.y}%`,
                background: `linear-gradient(to top, ${fw.color}, transparent)`,
                boxShadow: `0 0 6px ${fw.color}, 0 0 12px ${fw.color}`,
                transform: 'translateX(-50%)'
              }}
            />
          )}
          
          {/* Explosion particles */}
          {fw.exploded && fw.particles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size * p.life}px`,
                height: `${p.size * p.life}px`,
                backgroundColor: p.color,
                opacity: p.life,
                boxShadow: `0 0 ${4 * p.life}px ${p.color}, 0 0 ${8 * p.life}px ${p.color}`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
