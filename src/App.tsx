/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  PlayerStats,
  getLevelConfig,
  tickGameTimer,
  handleHazardDeath,
  respawnCurrentLevel,
  resetToLevelOne,
  completeCurrentLevel,
  TOTAL_LEVELS,
} from './game/rules.ts';
import { generateMaze, GeneratedMaze } from './game/maze.ts';
import { createGameScene, SceneRenderContext } from './game/renderer.ts';
import { PlayerController } from './game/controls.ts';
import { sound } from './game/audio.ts';
import { HUD } from './components/HUD.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { Modals } from './components/Modals.tsx';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneContextRef = useRef<SceneRenderContext | null>(null);
  const controllerRef = useRef<PlayerController | null>(null);
  const currentMazeRef = useRef<GeneratedMaze | null>(null);

  // High-frequency mutable game loop state kept in refs
  const statsRef = useRef<PlayerStats>({
    currentLevel: 1,
    timeRemaining: getLevelConfig(1).timeLimit,
    totalDeaths: 0,
    levelDeaths: 0,
    totalTimeElapsed: 0,
    levelTimeElapsed: 0,
    state: 'title',
  });

  const [uiStats, setUiStats] = useState<PlayerStats>(statsRef.current);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [deathMessage, setDeathMessage] = useState<string | null>(null);

  // Camera shake & hitstop effect timers
  const cameraShakeRef = useRef<number>(0);
  const hitstopTimerRef = useRef<number>(0);
  const respawnTimerRef = useRef<number>(0);

  // Sync dataset.state to document.body
  const syncBodyState = useCallback((state: string) => {
    document.body.dataset.state = state;
  }, []);

  // Initialize and load a maze level
  const loadMazeLevel = useCallback((levelNum: number) => {
    const config = getLevelConfig(levelNum);
    const maze = generateMaze(levelNum, config.width, config.height);
    currentMazeRef.current = maze;

    if (sceneContextRef.current) {
      sceneContextRef.current.loadLevel(maze, levelNum);
    }

    if (controllerRef.current) {
      controllerRef.current.resetPosition(maze.startPos.x, maze.startPos.z, maze.startAngle);
    }
  }, []);

  // Start game from Title or Restart
  const handleStartGame = useCallback(() => {
    sound.init();
    sound.resume();

    const level1Config = getLevelConfig(1);
    statsRef.current = {
      currentLevel: 1,
      timeRemaining: level1Config.timeLimit,
      totalDeaths: 0,
      levelDeaths: 0,
      totalTimeElapsed: 0,
      levelTimeElapsed: 0,
      state: 'playing',
    };
    setUiStats({ ...statsRef.current });
    syncBodyState('playing');

    loadMazeLevel(1);

    if (controllerRef.current) {
      controllerRef.current.requestPointerLock();
    }
  }, [loadMazeLevel, syncBodyState]);

  // Request pointer lock
  const handleRequestLock = useCallback(() => {
    sound.resume();
    if (controllerRef.current) {
      controllerRef.current.requestPointerLock();
    }
  }, []);

  // Pause
  const handlePause = useCallback(() => {
    if (statsRef.current.state === 'playing') {
      statsRef.current.state = 'paused';
      setUiStats({ ...statsRef.current });
      syncBodyState('paused');
      if (controllerRef.current) {
        controllerRef.current.exitPointerLock();
      }
    }
  }, [syncBodyState]);

  // Resume
  const handleResume = useCallback(() => {
    if (statsRef.current.state === 'paused') {
      statsRef.current.state = 'playing';
      setUiStats({ ...statsRef.current });
      syncBodyState('playing');
      if (controllerRef.current) {
        controllerRef.current.requestPointerLock();
      }
    }
  }, [syncBodyState]);

  // Restart current level
  const handleRestartCurrentLevel = useCallback(() => {
    statsRef.current = respawnCurrentLevel(statsRef.current);
    setUiStats({ ...statsRef.current });
    syncBodyState('playing');

    if (currentMazeRef.current && controllerRef.current) {
      controllerRef.current.resetPosition(
        currentMazeRef.current.startPos.x,
        currentMazeRef.current.startPos.z,
      );
      controllerRef.current.requestPointerLock();
    }
  }, [syncBodyState]);

  // Reset all the way to Level 1 (after timeout catastrophe)
  const handleResetToLevelOne = useCallback(() => {
    statsRef.current = resetToLevelOne(statsRef.current);
    setUiStats({ ...statsRef.current });
    syncBodyState('playing');

    loadMazeLevel(1);
    if (controllerRef.current) {
      controllerRef.current.requestPointerLock();
    }
  }, [loadMazeLevel, syncBodyState]);

  // Return to Title
  const handleReturnToTitle = useCallback(() => {
    statsRef.current.state = 'title';
    setUiStats({ ...statsRef.current });
    syncBodyState('title');
    if (controllerRef.current) {
      controllerRef.current.exitPointerLock();
    }
  }, [syncBodyState]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    sound.init();
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Keyboard shortcut listener for Esc (Pause) and M (Mute)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (statsRef.current.state === 'playing') {
          handlePause();
        } else if (statsRef.current.state === 'paused') {
          handleResume();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleToggleMute, handlePause, handleResume]);

  // Set up 3D Scene and Animation Loop once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sceneContext = createGameScene(canvas);
    sceneContextRef.current = sceneContext;

    const controller = new PlayerController(0, 0);
    controllerRef.current = controller;
    controller.attach(canvas, (locked) => {
      setIsPointerLocked(locked);
    });

    // Check autostart query param
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    if (autostart) {
      handleStartGame();
    } else {
      // Load initial level 1 in background for title screen flyover/atmosphere
      loadMazeLevel(1);
    }

    let animationFrameId: number;
    let lastTime = performance.now();
    let uiSyncTimer = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling
      const currentTime = now / 1000;

      // Handle hitstop freeze on heavy impact
      if (hitstopTimerRef.current > 0) {
        hitstopTimerRef.current -= dt;
      } else {
        // If respawning after hazard death, countdown respawn timer
        if (respawnTimerRef.current > 0) {
          respawnTimerRef.current -= dt;
          if (respawnTimerRef.current <= 0) {
            setDeathMessage(null);
            statsRef.current = respawnCurrentLevel(statsRef.current);
            if (currentMazeRef.current && controllerRef.current) {
              controllerRef.current.resetPosition(
                currentMazeRef.current.startPos.x,
                currentMazeRef.current.startPos.z,
              );
            }
          }
        }

        // Active gameplay logic
        if (statsRef.current.state === 'playing') {
          // 1. Tick countdown timer
          const prevTime = statsRef.current.timeRemaining;
          statsRef.current = tickGameTimer(statsRef.current, dt);

          // Audio heartbeat
          sound.updateHeartbeat(statsRef.current.timeRemaining);

          // 2. Check Timeout Catastrophe (RESET TO LEVEL 1)
          if (statsRef.current.state === 'gameover_timeout') {
            sound.playTimeoutBong();
            controller.exitPointerLock();
            syncBodyState('gameover');
          }

          // 3. Update player physics and collisions
          if (currentMazeRef.current && respawnTimerRef.current <= 0) {
            const result = controller.update(dt, currentMazeRef.current, currentTime);

            if (result.hazard) {
              // Stepped on lava or lethal spikes!
              statsRef.current = handleHazardDeath(statsRef.current, result.hazard);
              cameraShakeRef.current = 0.12;
              hitstopTimerRef.current = 0.08;
              respawnTimerRef.current = 0.85;

              if (result.hazard === 'lava') {
                sound.playLavaDeath();
                setDeathMessage('INCINERATED BY LAVA');
                sceneContext.triggerDeathBurst(
                  controller.physics.position.x,
                  0.3,
                  controller.physics.position.z,
                  0xff3300,
                );
              } else {
                sound.playSpikeDeath();
                setDeathMessage('IMPALED BY SPIKES');
                sceneContext.triggerDeathBurst(
                  controller.physics.position.x,
                  0.3,
                  controller.physics.position.z,
                  0xcc1100,
                );
              }
            } else if (result.exitReached) {
              // Reached level exit portal!
              if (statsRef.current.currentLevel >= TOTAL_LEVELS) {
                // Victory!
                statsRef.current = completeCurrentLevel(statsRef.current);
                sound.playVictoryFanfare();
                controller.exitPointerLock();
                syncBodyState('gameover');
              } else {
                // Next level
                sound.playLevelComplete();
                const nextLevel = statsRef.current.currentLevel + 1;
                statsRef.current = completeCurrentLevel(statsRef.current);
                loadMazeLevel(nextLevel);
              }
            }
          }
        } else if (statsRef.current.state === 'title') {
          // Gentle cinematic camera rotation on title screen
          if (currentMazeRef.current) {
            sceneContext.camera.position.x = Math.sin(currentTime * 0.25) * 8;
            sceneContext.camera.position.y = 2.4 + Math.sin(currentTime * 0.4) * 0.4;
            sceneContext.camera.position.z = Math.cos(currentTime * 0.25) * 8;
            sceneContext.camera.lookAt(0, 1.2, 0);
          }
        }
      }

      // Decay camera shake
      if (cameraShakeRef.current > 0) {
        cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 0.45);
      }

      // Apply player camera if playing or paused
      if (statsRef.current.state !== 'title') {
        controller.applyToCamera(sceneContext.camera, cameraShakeRef.current);
      }

      // Render 3D scene
      sceneContext.render(currentTime, dt, cameraShakeRef.current);

      // Throttle React UI updates to ~10Hz for solid 60fps WebGL
      uiSyncTimer += dt;
      if (uiSyncTimer >= 0.1) {
        uiSyncTimer = 0;
        setUiStats({ ...statsRef.current });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      controller.detach();
      sceneContext.dispose();
      sound.dispose();
    };
  }, [handleStartGame, loadMazeLevel, syncBodyState]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas Layer */}
      <canvas
        ref={canvasRef}
        data-testid="mazefire-canvas"
        className="absolute inset-0 w-full h-full block cursor-crosshair z-0"
      />

      {/* Retro CRT Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 retro-crt-lines opacity-40" />

      {/* Title Screen Overlay */}
      {uiStats.state === 'title' && <TitleScreen onStart={handleStartGame} />}

      {/* In-Game HUD Overlay */}
      {(uiStats.state === 'playing' || uiStats.state === 'paused' || uiStats.state === 'gameover_hazard') && (
        <HUD
          stats={uiStats}
          isPointerLocked={isPointerLocked}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onRequestLock={handleRequestLock}
          deathMessage={deathMessage}
        />
      )}

      {/* Modals for Pause, Timeout Catastrophe, and Victory */}
      <Modals
        stats={uiStats}
        onResume={handleResume}
        onRestartCurrentLevel={handleRestartCurrentLevel}
        onResetToLevelOne={handleResetToLevelOne}
        onReturnToTitle={handleReturnToTitle}
      />
    </div>
  );
}
