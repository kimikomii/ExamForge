import { useEffect, useRef } from 'react';

interface ConfettiBurstProps {
  burstKey: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

// Warm gold, khaki, brown, and sage green tones
const CONFETTI_COLORS = [
  '#D4A84F',
  '#C29B61',
  '#E8DEC8',
  '#D4C3A3',
  '#8B5A2B',
  '#5C4033',
  '#749B78',
  '#9FD0A6',
];

export function ConfettiBurst({ burstKey }: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (burstKey <= 0) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const origins = [width * 0.22, width * 0.5, width * 0.78];

    const particles: Particle[] = Array.from({ length: 120 }, (_, i) => {
      const originX = origins[i % origins.length] + (Math.random() - 0.5) * 80;
      const originY = height * 0.28 + (Math.random() - 0.5) * 40;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.45;
      const speed = 5 + Math.random() * 9;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        width: 6 + Math.random() * 6,
        height: 4 + Math.random() * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.24,
        opacity: 1,
      };
    });

    let animationFrameId = 0;
    const startTime = performance.now();
    const durationMs = 2800;

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      let hasVisible = false;
      for (const p of particles) {
        p.vy += 0.24; // gravity
        p.vx *= 0.99; // air drag
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (elapsed > durationMs * 0.6) {
          p.opacity = Math.max(0, 1 - (elapsed - durationMs * 0.6) / (durationMs * 0.4));
        }

        if (p.opacity > 0.01 && p.y < window.innerHeight + 40) {
          hasVisible = true;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
          ctx.restore();
        }
      }

      if (hasVisible && elapsed < durationMs) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', resize);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [burstKey]);

  if (burstKey <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
