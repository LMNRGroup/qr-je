import { useEffect, useState, useMemo } from 'react';

interface FloatingParticlesProps {
  count?: number;
  speed?: number;
  sizeRange?: [number, number];
  opacityRange?: [number, number];
}

export const FloatingParticles = ({
  count = 40,
  speed = 0.6,
  sizeRange = [2, 6],
  opacityRange = [0.08, 0.22],
}: FloatingParticlesProps) => {
  const [reducedMotion, setReducedMotion] = useState(false);

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

  // Generate random particles with CSS animation properties
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const xOffset = (Math.random() - 0.5) * 100; // -50 to 50 pixels
      const yOffset = (Math.random() - 0.5) * 100; // -50 to 50 pixels
      const duration = (15 + Math.random() * 20) / speed; // Convert to seconds
      const delay = Math.random() * 2;
      const opacity = opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]);
      const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      
      // Generate unique animation name for each particle to avoid conflicts
      const animationName = `float-${i}`;
      
      // Inject CSS keyframes for this particle
      if (typeof document !== 'undefined' && !reducedMotion) {
        const styleId = `particle-style-${i}`;
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @keyframes ${animationName} {
              0%, 100% {
                transform: translate(0, 0);
                opacity: ${opacity};
              }
              50% {
                transform: translate(${xOffset}px, ${yOffset}px);
                opacity: ${opacity * 0.3};
              }
            }
          `;
          document.head.appendChild(style);
        }
      }
      
      return {
        id: i,
        x,
        y,
        size,
        opacity,
        duration,
        delay,
        animationName,
      };
    });
  }, [count, speed, sizeRange, opacityRange, reducedMotion]);

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

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white will-change-transform"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animation: `${particle.animationName} ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            transform: 'translateZ(0)', // Force hardware acceleration
          }}
        />
      ))}
    </div>
  );
};
