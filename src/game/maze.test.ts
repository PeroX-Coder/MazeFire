import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze, isSpikeLethal, getSpikeHeightFraction, TILE_WALL, TILE_EMPTY } from './maze.ts';

test('generateMaze produces valid layouts for all 5 levels', () => {
  for (let lvl = 1; lvl <= 5; lvl++) {
    const maze = generateMaze(lvl, 11 + (lvl - 1) * 4, 11 + (lvl - 1) * 4);
    assert.equal(maze.grid.length, maze.height);
    assert.equal(maze.grid[0].length, maze.width);

    // Perimeter should be wall
    for (let x = 0; x < maze.width; x++) {
      assert.equal(maze.grid[0][x], TILE_WALL);
      assert.equal(maze.grid[maze.height - 1][x], TILE_WALL);
    }
    for (let z = 0; z < maze.height; z++) {
      assert.equal(maze.grid[z][0], TILE_WALL);
      assert.equal(maze.grid[z][maze.width - 1], TILE_WALL);
    }

    // Start must not be a wall
    assert.notEqual(maze.grid[1][1], TILE_WALL);

    // Exit must not be a wall
    assert.notEqual(maze.grid[maze.height - 2][maze.width - 2], TILE_WALL);

    // Level 5 has more spikes and lava than Level 1
    if (lvl === 5) {
      const maze1 = generateMaze(1, 11, 11);
      assert.ok(maze.spikes.length >= maze1.spikes.length);
      assert.ok(maze.lava.length >= maze1.lava.length);
    }
  }
});

test('Spike trap timing transitions correctly between safe and lethal', () => {
  const spike = {
    id: 1,
    gridX: 2,
    gridZ: 2,
    worldX: 0,
    worldZ: 0,
    period: 2.0,
    activeRatio: 0.5,
    phaseOffset: 0,
  };

  // At t=0.5 (within 0 to 1.0s active time), it is lethal
  assert.equal(isSpikeLethal(spike, 0.5), true);
  // At t=1.5 (between 1.0s and 2.0s), it is inactive
  assert.equal(isSpikeLethal(spike, 1.5), false);

  // Height fractions
  assert.ok(getSpikeHeightFraction(spike, 0.5) > 0.8);
  assert.equal(getSpikeHeightFraction(spike, 1.5), 0.0);
});
