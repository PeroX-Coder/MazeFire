import React from 'react';
import { PlayerStats, formatTime, getLevelConfig } from '../game/rules.ts';
import { Volume2, VolumeX, Pause, Skull, Flame, ShieldAlert } from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  isPointerLocked: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRequestLock: () => void;
  deathMessage: string | null;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  isPointerLocked,
  isMuted,
  onToggleMute,
  onPause,
  onRequestLock,
  deathMessage,
}) => {
  const currentConfig = getLevelConfig(stats.currentLevel);
  const isUrgent = stats.timeRemaining <= 20;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 select-none">
      {/* Top Header Bar: Stone Arch Carved Banner */}
      <div className="w-full flex items-center justify-between">
        {/* Left: Level Emblem & Title */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-neutral-900/90 border-2 border-stone-700/80 rounded-none shadow-lg text-amber-500 font-cinzel text-xs md:text-sm tracking-wider uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-600 rotate-45 inline-block"></span>
            <span>LVL {stats.currentLevel}/5: {currentConfig.name}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-950/80 border border-stone-800 text-stone-400 text-xs font-mono">
            <Skull className="w-3.5 h-3.5 text-stone-500" />
            <span>DEATHS: {stats.totalDeaths}</span>
          </div>
        </div>

        {/* Center: Fixed Countdown Timer Display */}
        <div className="flex flex-col items-center">
          <div
            className={`px-6 py-2 bg-stone-950/95 border-2 ${
              isUrgent ? 'border-red-600 animate-pulse' : 'border-amber-700/80'
            } shadow-2xl flex items-center gap-3`}
          >
            {isUrgent ? (
              <Flame className="w-5 h-5 text-red-500 animate-bounce" />
            ) : (
              <span className="text-amber-500 font-cinzel text-xs tracking-widest uppercase">TIME</span>
            )}
            <span
              className={`font-mono text-2xl md:text-3xl font-black tracking-widest tabular-nums ${
                isUrgent ? 'text-red-500 text-shadow-crimson' : 'text-amber-400 text-shadow-ember'
              }`}
            >
              {formatTime(stats.timeRemaining)}
            </span>
          </div>
          {isUrgent && (
            <span className="text-[10px] tracking-widest font-mono text-red-400 uppercase mt-1 bg-stone-950/90 px-2 py-0.5 border border-red-900/60">
              WARNING: TIMEOUT RESETS TO LEVEL 1!
            </span>
          )}
        </div>

        {/* Right: Sound & Pause Utility Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            tabIndex={-1}
            title="Toggle Sound (M)"
            className="w-9 h-9 bg-stone-950/90 border border-stone-700 hover:border-amber-500 text-stone-300 hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onPause}
            tabIndex={-1}
            title="Pause Game (Esc)"
            className="w-9 h-9 bg-stone-950/90 border border-stone-700 hover:border-amber-500 text-stone-300 hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Minimalist Retro Crosshair / Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-7 h-7 flex items-center justify-center opacity-65">
          <div className="w-1.5 h-1.5 bg-amber-400/90 rounded-none shadow-sm"></div>
          <div className="absolute -left-2 w-1.5 h-[1px] bg-stone-400/60"></div>
          <div className="absolute -right-2 w-1.5 h-[1px] bg-stone-400/60"></div>
          <div className="absolute -top-2 w-[1px] h-1.5 bg-stone-400/60"></div>
          <div className="absolute -bottom-2 w-[1px] h-1.5 bg-stone-400/60"></div>
        </div>
      </div>

      {/* Pointer Lock Prompt: Shows when mouse is not captured */}
      {!isPointerLocked && stats.state === 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-auto">
          <button
            onClick={onRequestLock}
            className="px-8 py-5 bg-stone-950/95 border-2 border-amber-600 hover:border-amber-400 text-amber-200 text-center shadow-2xl transition-all cursor-pointer group"
          >
            <div className="font-cinzel text-lg md:text-xl font-bold tracking-widest text-amber-400 group-hover:text-amber-300 flex items-center justify-center gap-2 mb-2">
              <span>CLICK TO ENTER LABYRINTH</span>
            </div>
            <div className="font-mono text-xs text-stone-400 space-x-2">
              <span>[WASD] MOVE</span>
              <span>·</span>
              <span>[MOUSE] LOOK</span>
              <span>·</span>
              <span>[SHIFT] SPRINT</span>
              <span>·</span>
              <span>[SPACE] JUMP</span>
            </div>
          </button>
        </div>
      )}

      {/* Hazard Death Flash Banner */}
      {deathMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 pointer-events-none animate-pulse">
          <div className="px-8 py-4 bg-stone-950/95 border-2 border-red-600 text-center shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-red-500 font-cinzel text-xl font-bold tracking-wider">
              <ShieldAlert className="w-6 h-6" />
              <span>{deathMessage}</span>
            </div>
            <p className="font-mono text-xs text-red-400/80 mt-1 uppercase tracking-widest">
              Respawning at Level {stats.currentLevel} Entrance
            </p>
          </div>
        </div>
      )}

      {/* Bottom Safe Margin: Controls reference */}
      <div className="w-full flex justify-between items-end text-[11px] font-mono text-stone-500">
        <div className="bg-stone-950/80 px-2 py-1 border border-stone-800">
          <span>NO MAP · NO CHECKPOINTS · SURVIVE THE INFERNO</span>
        </div>
        <div className="bg-stone-950/80 px-2 py-1 border border-stone-800">
          <span>ESC: PAUSE · M: AUDIO</span>
        </div>
      </div>
    </div>
  );
};
