"use client";

import { useState, useEffect, useCallback } from 'react';
import { EASTER_EGGS, isEasterEggEnabled } from '@/lib/easterEggs/registry';

interface TitleEaterProps {
  title: string;
  onComplete?: () => void;
}

// Different creatures that can eat the title
const CREATURES = [
  { emoji: '🐛', name: 'caterpillar', speed: 150 },
  { emoji: '🐌', name: 'snail', speed: 250 },
  { emoji: '🐁', name: 'mouse', speed: 100 },
  { emoji: '👾', name: 'alien', speed: 120 },
  { emoji: '🦖', name: 'dinosaur', speed: 80 },
  { emoji: '🦈', name: 'shark', speed: 60 },   // super fast
  { emoji: '🐢', name: 'turtle', speed: 300 }, // very slow

];

export function TitleEater({ title, onComplete }: TitleEaterProps) {
  const [displayTitle, setDisplayTitle] = useState(title);
  const [isEating, setIsEating] = useState(false);
  const [creature, setCreature] = useState(CREATURES[0]);
  const [showCreature, setShowCreature] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const startEating = useCallback(() => {
    if (isEating) return; // Don't restart if already eating
    if (triggered && displayTitle === title) {
      // Already completed once, allow re-trigger
      setTriggered(false);
    }
    if (triggered) return;
    if (!isEasterEggEnabled('titleEater')) return;

    setTriggered(true);
    // Pick a random creature
    const randomCreature = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    setCreature(randomCreature);
    setShowCreature(true);
    setIsEating(true);
  }, [triggered, isEating, displayTitle, title]);

  // Handle click to trigger immediately
  const handleClick = useCallback(() => {
    startEating();
  }, [startEating]);

  // Trigger after delay
  useEffect(() => {
    const config = EASTER_EGGS.titleEater;
    if (!config.enabled || triggered) return;

    const timer = setTimeout(() => {
      startEating();
    }, config.triggerDelay || 60000);

    return () => clearTimeout(timer);
  }, [triggered, startEating]);

  // Eating animation
  useEffect(() => {
    if (!isEating || displayTitle.length === 0) {
      if (isEating && displayTitle.length === 0) {
        // Done eating - wait a bit then restore
        setTimeout(() => {
          setShowCreature(false);
          setIsEating(false);
          // Burp and restore title
          setTimeout(() => {
            setDisplayTitle(title);
            onComplete?.();
          }, 500);
        }, 1000);
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayTitle(prev => prev.slice(0, -1));
    }, creature.speed);

    return () => clearTimeout(timer);
  }, [isEating, displayTitle, creature.speed, title, onComplete]);

  return (
    <span className="relative inline-flex items-center">
      <span
        className={`${isEating ? 'transition-all' : ''} cursor-pointer select-none`}
        onClick={handleClick}
        title="Click me..."
      >
        {displayTitle || <span className="opacity-0">.</span>}
      </span>
      {showCreature && (
        <span
          className={`absolute transition-all duration-300 ${
            displayTitle.length === 0
              ? 'animate-bounce'
              : ''
          }`}
          style={{
            right: '-1.5em',
            fontSize: '1.2em',
          }}
          title={`A hungry ${creature.name}!`}
        >
          {creature.emoji}
        </span>
      )}
    </span>
  );
}
