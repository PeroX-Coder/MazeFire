/**
 * Maze generation and layout definition for MazeFire
 * Produces labyrinth layouts with guaranteed solvable paths,
 * lava pools, spike traps, torches, and start/exit locations.
 */

export const TILE_EMPTY = 0;
export const TILE_WALL = 1;
export const TILE_LAVA = 2;
export const TILE_SPIKE = 3;

export interface SpikeTrapData {
  id: number;
  gridX: number;
  gridZ: number;
  worldX: number;
  worldZ: number;
  period: number; // cycle duration in seconds (e.g. 2.6s)
  activeRatio: number; // fraction of time spikes are up (e.g. 0.45)
  phaseOffset: number; // offset in seconds
}

export interface LavaPitData {
  id: number;
  gridX: number;
  gridZ: number;
  worldX: number;
  worldZ: number;
}

export interface TorchData {
  id: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  normalX: number; // direction torch points from wall
  normalZ: number;
}

export interface GeneratedMaze {
  width: number;
  height: number;
  tileSize: number; // in world units (e.g. 3.0 meters)
  wallHeight: number;
  grid: number[][]; // [z][x]
  startPos: { x: number; z: number };
  startAngle: number;
  exitPos: { x: number; z: number };
  spikes: SpikeTrapData[];
  lava: LavaPitData[];
  torches: TorchData[];
}

// Pseudo-random generator with seed for deterministic maze per level
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate a complete maze for a given level
 */
export function generateMaze(levelNumber: number, width: number, height: number): GeneratedMaze {
  const tileSize = 3.2; // corridor width
  const wallHeight = 3.6; // high claustrophobic stone walls
  const rng = createSeededRandom(levelNumber * 777 + 101);

  // Initialize grid filled with walls
  const grid: number[][] = [];
  for (let z = 0; z < height; z++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(TILE_WALL);
    }
    grid.push(row);
  }

  // Carve using Randomized Depth-First Search with backtracking
  const stack: [number, number][] = [];
  const startX = 1;
  const startZ = 1;
  grid[startZ][startX] = TILE_EMPTY;
  stack.push([startX, startZ]);

  const directions = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];

  while (stack.length > 0) {
    const [currentX, currentZ] = stack[stack.length - 1];

    // Find unvisited neighbors at step 2
    const neighbors: [number, number, number, number][] = [];
    for (const [dx, dz] of directions) {
      const nx = currentX + dx;
      const nz = currentZ + dz;
      if (nx > 0 && nx < width - 1 && nz > 0 && nz < height - 1 && grid[nz][nx] === TILE_WALL) {
        neighbors.push([nx, nz, currentX + dx / 2, currentZ + dz / 2]);
      }
    }

    if (neighbors.length > 0) {
      // Pick random neighbor
      const idx = Math.floor(rng() * neighbors.length);
      const [nx, nz, wallX, wallZ] = neighbors[idx];
      grid[wallZ][wallX] = TILE_EMPTY;
      grid[nz][nx] = TILE_EMPTY;
      stack.push([nx, nz]);
    } else {
      stack.pop();
    }
  }

  // Ensure exit is carved at bottom-right
  const exitX = width - 2;
  const exitZ = height - 2;
  grid[exitZ][exitX] = TILE_EMPTY;
  // If exit is walled off from its neighbor, open it
  if (grid[exitZ - 1][exitX] === TILE_WALL && grid[exitZ][exitX - 1] === TILE_WALL) {
    grid[exitZ - 1][exitX] = TILE_EMPTY;
  }

  // Add loop corridors (braiding) so it's not a strict tree and allows escaping hazards
  const loopCount = Math.floor((width * height) * 0.05);
  for (let i = 0; i < loopCount; i++) {
    const rx = 1 + Math.floor(rng() * (width - 2));
    const rz = 1 + Math.floor(rng() * (height - 2));
    if (grid[rz][rx] === TILE_WALL) {
      // Check if carving this wall connects two open paths
      const horiz = grid[rz][rx - 1] === TILE_EMPTY && grid[rz][rx + 1] === TILE_EMPTY;
      const vert = grid[rz - 1][rx] === TILE_EMPTY && grid[rz + 1][rx] === TILE_EMPTY;
      if (horiz || vert) {
        grid[rz][rx] = TILE_EMPTY;
      }
    }
  }

  // Keep start (1, 1) and surrounding safe
  const safeCells = new Set<string>();
  safeCells.add(`1,1`);
  safeCells.add(`1,2`);
  safeCells.add(`2,1`);
  safeCells.add(`${exitX},${exitZ}`);
  safeCells.add(`${exitX - 1},${exitZ}`);
  safeCells.add(`${exitX},${exitZ - 1}`);

  // Collect candidate path cells
  const candidateCells: [number, number][] = [];
  for (let z = 1; z < height - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[z][x] === TILE_EMPTY && !safeCells.has(`${x},${z}`)) {
        candidateCells.push([x, z]);
      }
    }
  }

  // Shuffle candidate cells
  for (let i = candidateCells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidateCells[i], candidateCells[j]] = [candidateCells[j], candidateCells[i]];
  }

  // Scale hazard count by level
  const numLava = Math.min(candidateCells.length / 4, 2 + levelNumber * 3);
  const numSpikes = Math.min(candidateCells.length / 4, 3 + levelNumber * 4);

  const lava: LavaPitData[] = [];
  const spikes: SpikeTrapData[] = [];

  let candidateIdx = 0;

  // Assign lava pits
  for (let i = 0; i < numLava && candidateIdx < candidateCells.length; i++) {
    const [lx, lz] = candidateCells[candidateIdx++];
    grid[lz][lx] = TILE_LAVA;
    lava.push({
      id: i + 1,
      gridX: lx,
      gridZ: lz,
      worldX: (lx - width / 2 + 0.5) * tileSize,
      worldZ: (lz - height / 2 + 0.5) * tileSize,
    });
  }

  // Assign spike traps with varied timing
  for (let i = 0; i < numSpikes && candidateIdx < candidateCells.length; i++) {
    const [sx, sz] = candidateCells[candidateIdx++];
    grid[sz][sx] = TILE_SPIKE;
    spikes.push({
      id: i + 1,
      gridX: sx,
      gridZ: sz,
      worldX: (sx - width / 2 + 0.5) * tileSize,
      worldZ: (sz - height / 2 + 0.5) * tileSize,
      period: 2.2 + rng() * 1.6, // 2.2s - 3.8s
      activeRatio: 0.38 + rng() * 0.15, // up ~45% of time
      phaseOffset: rng() * 3.0,
    });
  }

  // Find wall positions for torches (placed frequently so corridors are well marked)
  const torches: TorchData[] = [];
  let torchId = 1;
  const torchSpacing = 3;

  for (let z = 1; z < height - 1; z += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      if (grid[z][x] === TILE_EMPTY || grid[z][x] === TILE_SPIKE) {
        if ((x + z) % torchSpacing === 0) {
          // Check adjacent wall to anchor the sconce
          let nx = 0;
          let nz = 0;
          if (grid[z][x - 1] === TILE_WALL) nx = 1;
          else if (grid[z][x + 1] === TILE_WALL) nx = -1;
          else if (grid[z - 1][x] === TILE_WALL) nz = 1;
          else if (grid[z + 1][x] === TILE_WALL) nz = -1;

          if (nx !== 0 || nz !== 0) {
            const wx = (x - width / 2 + 0.5) * tileSize + (nx * (tileSize * 0.45));
            const wz = (z - height / 2 + 0.5) * tileSize + (nz * (tileSize * 0.45));
            torches.push({
              id: torchId++,
              worldX: wx,
              worldY: wallHeight * 0.55,
              worldZ: wz,
              normalX: nx,
              normalZ: nz,
            });
          }
        }
      }
    }
  }

  // World coordinates for start and exit
  const startWorldX = (startX - width / 2 + 0.5) * tileSize;
  const startWorldZ = (startZ - height / 2 + 0.5) * tileSize;
  const exitWorldX = (exitX - width / 2 + 0.5) * tileSize;
  const exitWorldZ = (exitZ - height / 2 + 0.5) * tileSize;

  // Determine start look angle facing open corridor
  let startAngle = 0;
  if (grid[1][2] !== TILE_WALL) {
    // Open towards +X
    startAngle = -Math.PI / 2;
  } else if (grid[2][1] !== TILE_WALL) {
    // Open towards +Z
    startAngle = Math.PI;
  }

  return {
    width,
    height,
    tileSize,
    wallHeight,
    grid,
    startPos: { x: startWorldX, z: startWorldZ },
    startAngle,
    exitPos: { x: exitWorldX, z: exitWorldZ },
    spikes,
    lava,
    torches,
  };
}

/**
 * Check if a spike trap is currently extended/lethal at time t
 */
export function isSpikeLethal(spike: SpikeTrapData, currentTime: number): boolean {
  const cycleTime = (currentTime + spike.phaseOffset) % spike.period;
  const activeDuration = spike.period * spike.activeRatio;
  return cycleTime < activeDuration;
}

/**
 * Get spike extension height (0.0 to 1.0) with anticipation and snapping animation
 */
export function getSpikeHeightFraction(spike: SpikeTrapData, currentTime: number): number {
  const cycleTime = (currentTime + spike.phaseOffset) % spike.period;
  const activeDuration = spike.period * spike.activeRatio;
  const transitionTime = 0.25; // fast snap up / retract

  if (cycleTime < transitionTime) {
    // Rising rapidly
    return Math.sin((cycleTime / transitionTime) * (Math.PI / 2));
  } else if (cycleTime < activeDuration - transitionTime) {
    // Fully extended
    return 1.0;
  } else if (cycleTime < activeDuration) {
    // Retracting back down
    const p = (activeDuration - cycleTime) / transitionTime;
    return Math.max(0, p);
  }
  // Resting down
  return 0.0;
}
