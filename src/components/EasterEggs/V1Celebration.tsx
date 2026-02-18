"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { isEasterEggEnabled, EASTER_EGGS } from '@/lib/easterEggs/registry';

// Celebration expires 7 days from deployment: Feb 25, 2026
const CELEBRATION_EXPIRY = new Date('2026-02-25T23:59:59').getTime();
const DISMISSED_KEY = 'v1CelebrationDismissed';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  trail: { x: number; y: number }[];
}

interface Rocket {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  color: string;
  exploded: boolean;
}

const COLORS = [
  '#ff4444', '#ff8844', '#ffcc44', '#44ff44', '#44ccff',
  '#4488ff', '#8844ff', '#ff44cc', '#ff6688', '#66ffcc',
  '#ffdd55', '#55ddff', '#ff55aa', '#aaff55', '#55aaff',
];

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function V1Celebration() {
  const [visible, setVisible] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);

  const dismiss = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(DISMISSED_KEY, '1');
    }, 600);
  }, []);

  useEffect(() => {
    // Check if celebration period is still active
    if (Date.now() > CELEBRATION_EXPIRY) return;
    // Check if already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    // Check registry
    if (!isEasterEggEnabled('v1Celebration')) return;

    const config = EASTER_EGGS.v1Celebration;
    const timer = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setBannerVisible(true), 400);
    }, config.triggerDelay || 500);

    return () => clearTimeout(timer);
  }, []);

  // Fireworks animation loop
  useEffect(() => {
    if (!visible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let lastRocket = 0;

    const spawnRocket = () => {
      const x = Math.random() * canvas.width * 0.6 + canvas.width * 0.2;
      rocketsRef.current.push({
        x,
        y: canvas.height,
        vy: -(8 + Math.random() * 5),
        targetY: canvas.height * 0.15 + Math.random() * canvas.height * 0.35,
        color: randomColor(),
        exploded: false,
      });
    };

    const explodeRocket = (rocket: Rocket) => {
      const count = 60 + Math.floor(Math.random() * 40);
      const baseColor = rocket.color;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 2 + Math.random() * 4;
        particlesRef.current.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 60 + Math.floor(Math.random() * 40),
          color: Math.random() > 0.3 ? baseColor : randomColor(),
          size: 2 + Math.random() * 2,
          trail: [],
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      if (now - lastRocket > 400 + Math.random() * 600) {
        spawnRocket();
        lastRocket = now;
      }

      // Update & draw rockets
      rocketsRef.current = rocketsRef.current.filter(r => {
        if (r.exploded) return false;
        r.y += r.vy;
        r.vy *= 0.98;

        // Draw rocket trail
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x + (Math.random() - 0.5) * 2, r.y + 12);
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (r.y <= r.targetY) {
          explodeRocket(r);
          r.exploded = true;
          return false;
        }
        return true;
      });

      // Update & draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 5) p.trail.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gravity
        p.vx *= 0.99;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) return false;

        // Draw trail
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          ctx.strokeStyle = p.color + Math.floor(p.life * 40).toString(16).padStart(2, '0');
          ctx.lineWidth = p.size * 0.5 * p.life;
          ctx.stroke();
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
        ctx.fill();

        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [visible]);

  // Auto-dismiss after 12 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 12000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      onClick={dismiss}
      style={{ cursor: 'pointer' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      />

      {/* Banner */}
      <div
        className={`relative z-10 text-center transition-all duration-700 ${
          bannerVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
      >
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md border border-yellow-400/50 rounded-2xl px-12 py-10 shadow-2xl max-w-lg">
          <div className="text-6xl mb-4">
            🎉🚀🎉
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 bg-clip-text text-transparent mb-3">
            v1.0 Released!
          </h1>
          <p className="text-gray-300 text-lg mb-2">
            Infrastructure Dashboard has officially reached
          </p>
          <p className="text-2xl font-bold text-white mb-4">
            Version 1.0
          </p>
          <div className="flex gap-2 justify-center text-2xl mb-4">
            🎆🎇🎆🎇🎆
          </div>
          <p className="text-gray-500 text-sm">
            Click anywhere to dismiss
          </p>
        </div>
      </div>
    </div>
  );
}
