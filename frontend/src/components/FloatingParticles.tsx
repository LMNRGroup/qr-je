import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

  // Generate random particles
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
    opacity: opacityRange[0] + Math.random() * (opacityRange[1] - opacityRange[0]),
    duration: (15 + Math.random() * 20) * speed, // Adjusted by speed multiplier
    delay: Math.random() * 2,
    xOffset: (Math.random() - 0.5) * 100, // -50 to 50 pixels
    yOffset: (Math.random() - 0.5) * 100, // -50 to 50 pixels
  }));

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
          }}
          animate={{
            opacity: [
              particle.opacity,
              particle.opacity * 0.3,
              particle.opacity,
            ],
            x: [0, particle.xOffset, 0],
            y: [0, particle.yOffset, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
};
