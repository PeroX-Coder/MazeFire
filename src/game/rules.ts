/**
 * MazeFire Game Rules and Level Definitions
 * Pure logic decoupled from rendering for determinism and fast unit testing.
 */

export interface LevelConfig {
  level: number;
  name: string;
  subtitle: string;
  width: number; // grid dimensions
  height: number;
  timeLimit: number; // in seconds
  lavaPits: number;
  spikeTraps: number;
  ambientLight: number;
  fogDensity: number;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: "The Forgotten Crypt",
    subtitle: "Stone corridors echoing with burning embers",
    width: 11,
    height: 11,
    timeLimit: 75,
    lavaPits: 2,
    spikeTraps: 3,
    ambientLight: 0.12,
    fogDensity: 0.08,
  },
  {
    level: 2,
    name: "The Ash Vaults",
    subtitle: "Searing chambers and narrow stone catwalks",
    width: 15,
    height: 15,
    timeLimit: 95,
    lavaPits: 5,
    spikeTraps: 7,
    ambientLight: 0.10,
    fogDensity: 0.09,
  },
  {
    level: 3,
    name: "The Obsidian Labyrinth",
    subtitle: "Twisting dark corridors filled with lethal traps",
    width: 19,
    height: 19,
    timeLimit: 115,
    lavaPits: 8,
    spikeTraps: 11,
    ambientLight: 0.08,
    fogDensity: 0.10,
  },
  {
    level: 4,
    name: "Infernal Chasm",
    subtitle: "Boiling magma trenches and merciless ticking death",
    width: 23,
    height: 23,
    timeLimit: 135,
    lavaPits: 12,
    spikeTraps: 15,
    ambientLight: 0.07,
    fogDensity: 0.11,
  },
  {
    level: 5,
    name: "The Brimstone Core",
    subtitle: "The ultimate trial. Escape or burn forever.",
    width: 27,
    height: 27,
    timeLimit: 155,
    lavaPits: 16,
    spikeTraps: 20,
    ambientLight: 0.06,
    fogDensity: 0.12,
  },
];

export const TOTAL_LEVELS = LEVELS.length;

export type GameState = 'title' | 'playing' | 'paused' | 'gameover_hazard' | 'gameover_timeout' | 'victory';

export interface PlayerStats {
  currentLevel: number;
  timeRemaining: number;
  totalDeaths: number;
  levelDeaths: number;
  totalTimeElapsed: number;
  levelTimeElapsed: number;
  state: GameState;
  causeOfDeath?: 'lava' | 'spikes' | 'timeout';
}

/**
 * Handle game timer tick
 * If time reaches 0, returns timeout penalty (RESET TO LEVEL 1)
 */
export function tickGameTimer(stats: PlayerStats, dt: number): PlayerStats {
  if (stats.state !== 'playing') return stats;

  const newTimeRemaining = Math.max(0, stats.timeRemaining - dt);
  const newLevelElapsed = stats.levelTimeElapsed + dt;
  const newTotalElapsed = stats.totalTimeElapsed + dt;

  if (newTimeRemaining <= 0) {
    // CRITICAL USER REQUIREMENT:
    // "If they can't complete that level in fix time, start from the Level 1 if they still on level 2,3,4 or 5-nothing cares."
    return {
      ...stats,
      timeRemaining: 0,
      totalTimeElapsed: newTotalElapsed,
      levelTimeElapsed: newLevelElapsed,
      state: 'gameover_timeout',
      causeOfDeath: 'timeout',
      totalDeaths: stats.totalDeaths + 1,
    };
  }

  return {
    ...stats,
    timeRemaining: newTimeRemaining,
    levelTimeElapsed: newLevelElapsed,
    totalTimeElapsed: newTotalElapsed,
  };
}

/**
 * Handle Hazard Death (Lava or Spikes)
 * Restarts from the START of the CURRENT level.
 */
export function handleHazardDeath(stats: PlayerStats, hazardType: 'lava' | 'spikes'): PlayerStats {
  return {
    ...stats,
    state: 'gameover_hazard',
    causeOfDeath: hazardType,
    totalDeaths: stats.totalDeaths + 1,
    levelDeaths: stats.levelDeaths + 1,
  };
}

/**
 * Respawn after Hazard Death:
 * Keeps the player on the SAME level.
 * USER REQUIREMENT: Timer is ongoing after death - no restart of timer after death!
 */
export function respawnCurrentLevel(stats: PlayerStats): PlayerStats {
  return {
    ...stats,
    state: 'playing',
    timeRemaining: stats.timeRemaining, // Ongoing timer!
    causeOfDeath: undefined,
  };
}

/**
 * Reset after Timeout:
 * Punishes player by sending them back to Level 1!
 */
export function resetToLevelOne(stats: PlayerStats): PlayerStats {
  const level1Config = getLevelConfig(1);
  return {
    ...stats,
    currentLevel: 1,
    state: 'playing',
    timeRemaining: level1Config.timeLimit,
    levelTimeElapsed: 0,
    levelDeaths: 0,
    causeOfDeath: undefined,
  };
}

/**
 * Advance to next level or win game if Level 5 cleared
 */
export function completeCurrentLevel(stats: PlayerStats): PlayerStats {
  if (stats.currentLevel >= TOTAL_LEVELS) {
    return {
      ...stats,
      state: 'victory',
    };
  }

  const nextLevel = stats.currentLevel + 1;
  const nextConfig = getLevelConfig(nextLevel);

  return {
    ...stats,
    currentLevel: nextLevel,
    timeRemaining: nextConfig.timeLimit,
    levelTimeElapsed: 0,
    levelDeaths: 0,
    state: 'playing',
  };
}

export function getLevelConfig(levelNumber: number): LevelConfig {
  const config = LEVELS.find((l) => l.level === levelNumber);
  return config || LEVELS[0];
}

export function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const tenths = Math.floor(Math.round((clamped % 1) * 10) % 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
}

export function formatMinutesSeconds(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if 2D coordinate is within distance of a target
 */
export function isNearPoint(px: number, pz: number, tx: number, tz: number, threshold: number): boolean {
  const dx = px - tx;
  const dz = pz - tz;
  return dx * dx + dz * dz <= threshold * threshold;
}
