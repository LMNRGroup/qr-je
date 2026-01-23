import { useEffect, useRef, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  size: number;
  color: string;
  delay: number;
}

interface LogoParticleAnimationProps {
  logoPath?: string;
  particleSize?: number;
  gridSize?: number;
  className?: string;
}

export function LogoParticleAnimation({
  logoPath = '/assets/QRC App Icon.png',
  particleSize = 8,
  gridSize = 40,
  className = '',
}: LogoParticleAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isForming, setIsForming] = useState(true);
  const [isBreaking, setIsBreaking] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationFrameRef = useRef<number>();
  const cycleRef = useRef(0);

  // Convert logo image to particle grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoPath;

    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      const maxSize = 200; // Max logo size in pixels
      const aspectRatio = img.width / img.height;
      const width = aspectRatio > 1 ? maxSize : maxSize * aspectRatio;
      const height = aspectRatio > 1 ? maxSize / aspectRatio : maxSize;

      canvas.width = width;
      canvas.height = height;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Create particles from image
      const newParticles: Particle[] = [];
      const step = Math.max(1, Math.floor(width / gridSize));
      let particleId = 0;

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];

          // Only create particle if pixel is visible (alpha > 50)
          if (a > 50) {
            const brightness = (r + g + b) / 3;
            const normalizedX = (x / width) * 100; // Convert to percentage
            const normalizedY = (y / height) * 100;

            // Calculate color based on brightness
            const color = brightness > 128
              ? `rgba(${r}, ${g}, ${b}, ${a / 255})`
              : `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, ${a / 255})`;

            newParticles.push({
              id: particleId++,
              x: Math.random() * 100, // Start scattered
              y: Math.random() * 100,
              targetX: normalizedX,
              targetY: normalizedY,
              startX: normalizedX,
              startY: normalizedY,
              size: particleSize + Math.random() * 2,
              color,
              delay: Math.random() * 0.5,
            });
          }
        }
      }

      setParticles(newParticles);
    };

    img.onerror = () => {
      console.warn('Failed to load logo image, using fallback particles');
      // Fallback: create a simple grid of particles
      const fallbackParticles: Particle[] = [];
      for (let i = 0; i < 100; i++) {
        fallbackParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          targetX: 50 + (Math.random() - 0.5) * 20,
          targetY: 50 + (Math.random() - 0.5) * 20,
          startX: 50 + (Math.random() - 0.5) * 20,
          startY: 50 + (Math.random() - 0.5) * 20,
          size: particleSize,
          color: 'rgba(59, 130, 246, 0.8)',
          delay: Math.random() * 0.5,
        });
      }
      setParticles(fallbackParticles);
    };
  }, [logoPath, particleSize, gridSize]);

  // Animation cycle: form → hold → break → repeat
  useEffect(() => {
    if (particles.length === 0) return;

    const cycleDuration = 6000; // 6 seconds per cycle
    const formDuration = 2000; // 2s to form
    const holdDuration = 2000; // 2s hold
    const breakDuration = 2000; // 2s to break
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) % cycleDuration;
      const cycleTime = elapsed / 1000;
      const progress = elapsed / cycleDuration;

      setAnimationProgress(progress);

      if (cycleTime < formDuration / 1000) {
        // Forming phase
        setIsForming(true);
        setIsBreaking(false);
      } else if (cycleTime < (formDuration + holdDuration) / 1000) {
        // Holding phase
        setIsForming(false);
        setIsBreaking(false);
      } else {
        // Breaking phase
        setIsForming(false);
        setIsBreaking(true);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles.length]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="hidden" />
      <div className="relative w-full h-full" style={{ position: 'relative' }}>
        {particles.map((particle) => {
          // Calculate position based on animation progress (0-1)
          const phase = animationProgress;
          let currentX: number;
          let currentY: number;
          let opacity: number;

          if (phase < 0.333) {
            // Forming: 0-33% of cycle
            const formProgress = phase / 0.333;
            const easeProgress = 1 - Math.pow(1 - formProgress, 3); // Ease out cubic
            currentX = particle.x + (particle.targetX - particle.x) * easeProgress;
            currentY = particle.y + (particle.targetY - particle.y) * easeProgress;
            opacity = easeProgress;
          } else if (phase < 0.666) {
            // Holding: 33-66% of cycle
            currentX = particle.targetX;
            currentY = particle.targetY;
            opacity = 1;
          } else {
            // Breaking: 66-100% of cycle
            const breakProgress = (phase - 0.666) / 0.334;
            const easeProgress = Math.pow(breakProgress, 2); // Ease in quadratic
            // Scatter particles in random directions using golden angle
            const angle = (particle.id * 137.5) % 360; // Golden angle for even distribution
            const distance = 50 * easeProgress;
            currentX = particle.targetX + Math.cos(angle * Math.PI / 180) * distance;
            currentY = particle.targetY + Math.sin(angle * Math.PI / 180) * distance;
            opacity = 1 - easeProgress * 0.7;
          }

          return (
            <div
              key={particle.id}
              className="absolute rounded-sm transition-all duration-100 ease-out"
              style={{
                left: `${currentX}%`,
                top: `${currentY}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                opacity,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 ${particle.size}px ${particle.color}`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
