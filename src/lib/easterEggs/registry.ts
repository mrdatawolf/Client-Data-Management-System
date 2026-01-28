// Easter Egg Registry - Add new easter eggs here

export interface EasterEggConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerDelay?: number; // ms before triggering (0 = immediate)
  probability?: number;  // 0-1, chance of triggering (1 = always)
}

export const EASTER_EGGS: Record<string, EasterEggConfig> = {
  titleEater: {
    id: 'titleEater',
    name: 'Title Eater',
    description: 'A hungry creature eats the dashboard title',
    enabled: true,
    triggerDelay: 60000, // 1 minute
    probability: 1,
  },
  // Add more easter eggs here:
  // konamiCode: {
  //   id: 'konamiCode',
  //   name: 'Konami Code',
  //   description: 'Enter the famous code for a surprise',
  //   enabled: false,
  //   triggerDelay: 0,
  //   probability: 1,
  // },
};

export function isEasterEggEnabled(id: string): boolean {
  const egg = EASTER_EGGS[id];
  if (!egg || !egg.enabled) return false;
  if (egg.probability !== undefined && egg.probability < 1) {
    return Math.random() < egg.probability;
  }
  return true;
}
