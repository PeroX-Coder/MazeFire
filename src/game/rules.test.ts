import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS,
  TOTAL_LEVELS,
  tickGameTimer,
  handleHazardDeath,
  respawnCurrentLevel,
  resetToLevelOne,
  completeCurrentLevel,
  getLevelConfig,
  formatTime,
  isNearPoint,
  PlayerStats,
} from './rules.ts';

test('Level configurations exist for all 5 levels with progressively harder settings', () => {
  assert.equal(TOTAL_LEVELS, 5);
  for (let i = 1; i <= 5; i++) {
    const cfg = getLevelConfig(i);
    assert.equal(cfg.level, i);
    assert.ok(cfg.width >= 11);
    assert.ok(cfg.height >= 11);
    assert.ok(cfg.timeLimit > 0);
  }
  // Level 5 is larger than Level 1
  assert.ok(getLevelConfig(5).width > getLevelConfig(1).width);
  assert.ok(getLevelConfig(5).timeLimit > getLevelConfig(1).timeLimit);
  assert.ok(getLevelConfig(5).spikeTraps > getLevelConfig(1).spikeTraps);
});

test('tickGameTimer decrements time and triggers timeout to gameover_timeout when time hits 0', () => {
  const initial: PlayerStats = {
    currentLevel: 3,
    timeRemaining: 1.5,
    totalDeaths: 2,
    levelDeaths: 0,
    totalTimeElapsed: 50,
    levelTimeElapsed: 20,
    state: 'playing',
  };

  const ticked = tickGameTimer(initial, 0.5);
  assert.equal(ticked.timeRemaining, 1.0);
  assert.equal(ticked.state, 'playing');

  // Next tick finishes remaining time
  const timedOut = tickGameTimer(ticked, 1.1);
  assert.equal(timedOut.timeRemaining, 0);
  assert.equal(timedOut.state, 'gameover_timeout');
  assert.equal(timedOut.causeOfDeath, 'timeout');
  assert.equal(timedOut.totalDeaths, 3);
});

test('Timeout reset forces player back to Level 1', () => {
  const onLevel4: PlayerStats = {
    currentLevel: 4,
    timeRemaining: 0,
    totalDeaths: 5,
    levelDeaths: 2,
    totalTimeElapsed: 250,
    levelTimeElapsed: 120,
    state: 'gameover_timeout',
    causeOfDeath: 'timeout',
  };

  const reset = resetToLevelOne(onLevel4);
  assert.equal(reset.currentLevel, 1);
  assert.equal(reset.state, 'playing');
  assert.equal(reset.timeRemaining, getLevelConfig(1).timeLimit);
  assert.equal(reset.levelTimeElapsed, 0);
  assert.equal(reset.levelDeaths, 0);
  assert.equal(reset.totalDeaths, 5); // preserves overall deaths count
});

test('Hazard death (lava/spikes) keeps current level on respawn', () => {
  const onLevel3: PlayerStats = {
    currentLevel: 3,
    timeRemaining: 60,
    totalDeaths: 1,
    levelDeaths: 0,
    totalTimeElapsed: 100,
    levelTimeElapsed: 40,
    state: 'playing',
  };

  const killed = handleHazardDeath(onLevel3, 'lava');
  assert.equal(killed.state, 'gameover_hazard');
  assert.equal(killed.causeOfDeath, 'lava');
  assert.equal(killed.totalDeaths, 2);
  assert.equal(killed.levelDeaths, 1);

  const respawned = respawnCurrentLevel(killed);
  assert.equal(respawned.currentLevel, 3); // STAY on level 3!
  assert.equal(respawned.state, 'playing');
  assert.equal(respawned.timeRemaining, 60); // Ongoing timer: timer does NOT restart after death!
  assert.equal(respawned.causeOfDeath, undefined);
});

test('completeCurrentLevel advances to next level until Level 5 produces victory', () => {
  let stats: PlayerStats = {
    currentLevel: 1,
    timeRemaining: 20,
    totalDeaths: 0,
    levelDeaths: 0,
    totalTimeElapsed: 55,
    levelTimeElapsed: 55,
    state: 'playing',
  };

  stats = completeCurrentLevel(stats);
  assert.equal(stats.currentLevel, 2);
  assert.equal(stats.state, 'playing');

  stats = completeCurrentLevel(stats);
  assert.equal(stats.currentLevel, 3);

  stats = completeCurrentLevel(stats);
  assert.equal(stats.currentLevel, 4);

  stats = completeCurrentLevel(stats);
  assert.equal(stats.currentLevel, 5);
  assert.equal(stats.state, 'playing');

  // Complete level 5 -> Victory!
  stats = completeCurrentLevel(stats);
  assert.equal(stats.state, 'victory');
});

test('formatTime outputs mm:ss.t format', () => {
  assert.equal(formatTime(75.4), '01:15.4');
  assert.equal(formatTime(9.2), '00:09.2');
  assert.equal(formatTime(0), '00:00.0');
});

test('isNearPoint checks distance correctly', () => {
  assert.equal(isNearPoint(0, 0, 1, 1, 1.5), true);
  assert.equal(isNearPoint(0, 0, 5, 5, 2), false);
});
