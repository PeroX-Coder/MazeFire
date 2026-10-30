import React from 'react';
import { PlayerStats, formatMinutesSeconds, formatTime, getLevelConfig } from '../game/rules.ts';
import { Skull, Trophy, AlertTriangle, RotateCcw, Play, Home } from 'lucide-react';

interface ModalsProps {
  stats: PlayerStats;
  onResume: () => void;
  onRestartCurrentLevel: () => void;
  onResetToLevelOne: () => void;
  onReturnToTitle: () => void;
}

export const Modals: React.FC<ModalsProps> = ({
  stats,
  onResume,
  onRestartCurrentLevel,
  onResetToLevelOne,
  onReturnToTitle,
}) => {
  // 1. Pause Modal
  if (stats.state === 'paused') {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 select-none p-4 pointer-events-auto">
        <div className="w-full max-w-md bg-stone-950 border-2 border-stone-700 shadow-2xl p-6 text-center">
          <h2 className="font-cinzel text-2xl font-bold text-amber-400 tracking-widest uppercase mb-1">
            GAME PAUSED
          </h2>
          <p className="font-mono text-xs text-stone-400 mb-6">
            Level {stats.currentLevel}: {getLevelConfig(stats.currentLevel).name}
          </p>

          <div className="space-y-3 font-cinzel">
            <button
              onClick={onResume}
              data-start="true"
              className="w-full py-3 bg-amber-800 hover:bg-amber-700 border border-amber-500 text-amber-100 font-bold tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-amber-200" />
              <span>RESUME TRIAL</span>
            </button>

            <button
              onClick={onRestartCurrentLevel}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART CURRENT LEVEL</span>
            </button>

            <button
              onClick={onReturnToTitle}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>RETURN TO TITLE</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Timeout Catastrophe Modal (Reset to Level 1)
  if (stats.state === 'gameover_timeout') {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-red-950/85 select-none p-4 pointer-events-auto">
        <div className="w-full max-w-lg bg-stone-950 border-2 border-red-600 shadow-2xl p-6 md:p-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-red-950/80 border border-red-700 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
          </div>

          <h2 className="font-cinzel text-3xl font-black text-red-500 text-shadow-crimson tracking-widest uppercase mb-1">
            TIME EXPIRED!
          </h2>
          <p className="font-cinzel text-sm text-red-300 font-bold uppercase tracking-wider mb-4">
            THE INFERNO CONSUMED YOU
          </p>

          <div className="bg-red-950/40 border border-red-900/60 p-4 mb-6 text-left">
            <p className="font-mono text-xs text-red-200 leading-relaxed">
              You failed to escape Level {stats.currentLevel} before the sands ran out.
              The ancient curse shows no mercy: <strong>all level progress has been destroyed.</strong>
            </p>
          </div>

          {/* Run Statistics */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center mb-6">
            <div className="bg-stone-900 p-2.5 border border-stone-800">
              <span className="block text-[10px] text-stone-500 uppercase">Fell At</span>
              <span className="text-sm font-bold text-amber-400">LVL {stats.currentLevel}</span>
            </div>
            <div className="bg-stone-900 p-2.5 border border-stone-800">
              <span className="block text-[10px] text-stone-500 uppercase">Deaths</span>
              <span className="text-sm font-bold text-red-400">{stats.totalDeaths}</span>
            </div>
            <div className="bg-stone-900 p-2.5 border border-stone-800">
              <span className="block text-[10px] text-stone-500 uppercase">Run Time</span>
              <span className="text-sm font-bold text-stone-300">{formatMinutesSeconds(stats.totalTimeElapsed)}</span>
            </div>
          </div>

          <button
            onClick={onResetToLevelOne}
            data-start="true"
            className="w-full py-4 bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border-2 border-red-500 text-red-100 font-cinzel text-base md:text-lg font-bold tracking-widest uppercase transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>START AGAIN AT LEVEL 1</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Victory Modal (Conquered all 5 levels)
  if (stats.state === 'victory') {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-stone-950/90 select-none p-4 pointer-events-auto">
        <div className="w-full max-w-lg bg-stone-950 border-2 border-amber-500 shadow-2xl p-6 md:p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-950/70 border-2 border-amber-500 flex items-center justify-center">
              <Trophy className="w-9 h-9 text-amber-400" />
            </div>
          </div>

          <h2 className="font-cinzel text-3xl md:text-4xl font-black text-amber-400 text-shadow-ember tracking-widest uppercase mb-1">
            MAZEFIRE CONQUERED!
          </h2>
          <p className="font-cinzel text-xs md:text-sm text-amber-200/90 tracking-widest uppercase mb-6">
            YOU HAVE CONQUERED ALL 5 LABYRINTHS OF DEATH
          </p>

          <p className="font-mono text-xs text-stone-300 max-w-md mx-auto mb-6 leading-relaxed">
            Through raw patience, spatial mastery, and dodging spikes and molten rock against the merciless ticking clock, you have emerged victorious from the Brimstone Core.
          </p>

          {/* Victory Stats */}
          <div className="grid grid-cols-2 gap-4 font-mono text-center mb-8 max-w-xs mx-auto">
            <div className="bg-stone-900 p-3 border border-stone-800">
              <span className="block text-[11px] text-stone-500 uppercase">Total Time</span>
              <span className="text-xl font-bold text-amber-400 tabular-nums">
                {formatMinutesSeconds(stats.totalTimeElapsed)}
              </span>
            </div>
            <div className="bg-stone-900 p-3 border border-stone-800">
              <span className="block text-[11px] text-stone-500 uppercase">Total Deaths</span>
              <span className="text-xl font-bold text-red-400 tabular-nums">
                {stats.totalDeaths}
              </span>
            </div>
          </div>

          <button
            onClick={onResetToLevelOne}
            data-start="true"
            className="w-full py-4 bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 border-2 border-amber-400 text-amber-100 font-cinzel text-base md:text-lg font-bold tracking-widest uppercase transition shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-amber-200" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
