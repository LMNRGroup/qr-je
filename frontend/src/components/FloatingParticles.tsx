import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface FloatingParticlesProps {
  count?: number;
  speed?: number;
  sizeRange?: [number, number];
  opacityRange?: [number, number];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  xOffset: number;
  yOffset: number;
  baseX: number;
  baseY: number;
}

export const FloatingParticles = ({
  count = 40,
  speed = 0.6,
  sizeRange = [2, 6],
  opacityRange = [0.08, 0.22],
}: FloatingParticlesProps) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Generate random particles
  const particles = Array.from({ length: count }, (_, i) => {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    return {
      id: i,
      x,
      y,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      opacity: opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]),
      duration: (15 + Math.random() * 20) * speed,
      delay: Math.random() * 2,
      xOffset: (Math.random() - 0.5) * 100,
      yOffset: (Math.random() - 0.5) * 100,
      baseX: x,
      baseY: y,
    };
  });

  // Store particles ref for tap interaction
  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't interfere with form interactions
    const target = e.target as HTMLElement;
    if (target.closest('form') || target.closest('button') || target.closest('input')) {
      return;
    }
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let clientX: number;
    let clientY: number;
    
    if ('touches' in e && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setTapPosition({ x, y });
    
    // Reset tap position after animation
    setTimeout(() => setTapPosition(null), 800);
  };

  if (reducedMotion) {
    // Return static particles if reduced motion is preferred
    return (
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
            }}
          />
        ))}
      </div>
    );
  }

  // Calculate distance from tap point for each particle
  const getTapReaction = (particle: Particle) => {
    if (!tapPosition) return { x: 0, y: 0, scale: 1 };
    
    const dx = tapPosition.x - particle.x;
    const dy = tapPosition.y - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Particles within 15% distance react
    if (distance < 15) {
      const force = (15 - distance) / 15; // 0 to 1
      const angle = Math.atan2(dy, dx);
      const pushDistance = force * 30; // Push away up to 30px
      
      return {
        x: Math.cos(angle) * pushDistance,
        y: Math.sin(angle) * pushDistance,
        scale: 1 + force * 0.5, // Scale up slightly
      };
    }
    
    return { x: 0, y: 0, scale: 1 };
  };

  return (
    <>
      {/* Transparent tap detection layer - doesn't block form */}
      <div 
        className="fixed inset-0 z-[1]"
        onMouseDown={handleTap}
        onTouchStart={handleTap}
        style={{ pointerEvents: 'auto' }}
      />
      
      {/* Particles container */}
      <div 
        ref={containerRef}
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      >
        {particles.map((particle) => {
          const tapReaction = getTapReaction(particle);
          const hasTapReaction = tapPosition !== null && (tapReaction.x !== 0 || tapReaction.y !== 0);
          
          return (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
              }}
              initial={{
                opacity: particle.opacity,
                x: 0,
                y: 0,
                scale: 1,
              }}
              animate={{
                opacity: [
                  particle.opacity,
                  particle.opacity * 0.3,
                  particle.opacity,
                ],
                x: hasTapReaction 
                  ? [0, particle.xOffset + tapReaction.x, particle.xOffset, 0]
                  : [0, particle.xOffset, 0],
                y: hasTapReaction
                  ? [0, particle.yOffset + tapReaction.y, particle.yOffset, 0]
                  : [0, particle.yOffset, 0],
                scale: hasTapReaction
                  ? [1, tapReaction.scale, 1.1, 1]
                  : [1, 1, 1],
              }}
              transition={{
                duration: hasTapReaction ? 0.6 : particle.duration,
                repeat: hasTapReaction ? 0 : Infinity,
                ease: hasTapReaction ? 'easeOut' : 'easeInOut',
                delay: hasTapReaction ? 0 : particle.delay,
              }}
            />
          );
        })}
      </div>
    </>
  );
};
