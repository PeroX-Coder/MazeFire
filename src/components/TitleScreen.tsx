import React, { useEffect } from 'react';
import { Skull, Flame, Hourglass, Compass, Play } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between items-center p-6 md:p-12 select-none bg-stone-950/85">
      {/* Top Banner / Old-gen PC release tag */}
      <div className="w-full flex justify-between items-center text-xs font-mono text-stone-500 uppercase tracking-widest border-b border-stone-800 pb-3">
        <span className="flex items-center gap-1.5 text-amber-600 font-bold">
          <Flame className="w-4 h-4 text-amber-500" />
          FIRST-PERSON DUNGEON TRIAL
        </span>
        <span className="hidden sm:inline">PC / LAPTOP EXCLUSIVE · 3D RETRO GRAPHICS</span>
        <span>BUILD 1.05</span>
      </div>

      {/* Center Monument: Bespoke SVG Title Lockup & Negative-Space Staging */}
      <div className="flex flex-col items-center max-w-2xl text-center my-auto">
        {/* Custom Inline SVG Crest Emblem */}
        <div className="mb-4 relative flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-24 h-24 md:w-28 md:h-28 text-amber-600 drop-shadow-[0_0_15px_rgba(234,88,12,0.6)]"
            fill="none"
            stroke="currentColor"
          >
            {/* Outer gothic octagon shield */}
            <polygon
              points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30"
              strokeWidth="3.5"
              strokeLinejoin="miter"
              className="fill-stone-900/90 stroke-amber-700"
            />
            {/* Inner maze wall lines */}
            <path
              d="M20,30 L40,30 L40,50 L60,50 L60,30 L80,30 M20,70 L40,70 L40,50 M60,70 L80,70 M50,15 L50,35"
              strokeWidth="2.5"
              strokeLinecap="square"
              className="stroke-stone-600"
            />
            {/* Central roaring flame */}
            <path
              d="M50,35 C42,48 40,58 45,68 C47,72 53,72 55,68 C60,58 58,48 50,35 Z"
              className="fill-amber-500 stroke-red-600"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Bespoke Title Lockup */}
        <h1 className="font-cinzel text-5xl sm:text-6xl md:text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-red-700 text-shadow-ember uppercase mb-2">
          MAZEFIRE
        </h1>
        <p className="font-cinzel text-xs sm:text-sm text-amber-500/90 tracking-[0.25em] uppercase mb-6">
          THE FIVE LABYRINTHS OF CHAOS & PATIENCE
        </p>

        {/* Lore / Unforgiving Rules Warning Plaque */}
        <div className="bg-stone-900/90 border border-stone-800 p-4 mb-8 text-left max-w-lg shadow-2xl">
          <div className="text-amber-400 font-cinzel text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5 border-b border-stone-800 pb-1">
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span>UNCOMPROMISING DUNGEON RULES</span>
          </div>
          <ul className="text-stone-300 font-mono text-xs space-y-1.5 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">1.</span>
              <span><strong>5 Levels to Conquer:</strong> Each maze becomes wider, darker, and longer.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">2.</span>
              <span><strong>Lethal Hazards:</strong> Stepping on active spike traps or lava resets your current level.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">3.</span>
              <span><strong>Unforgiving Timer:</strong> If time expires, you are stripped of all progress and sent back to <strong>LEVEL 1</strong>!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-stone-400 font-bold">4.</span>
              <span><strong>No Map. No Checkpoints. No Hints.</strong> Rely on memory and ears.</span>
            </li>
          </ul>
        </div>

        {/* Primary Start CTA Button */}
        <button
          onClick={onStart}
          data-start="true"
          className="group relative px-10 py-4 bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 border-2 border-amber-400 text-amber-100 font-cinzel text-lg md:text-xl font-bold tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(217,119,6,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] cursor-pointer active:translate-y-0.5 flex items-center gap-3"
        >
          <Play className="w-5 h-5 fill-amber-200" />
          <span>ENTER THE INFERNO</span>
        </button>
        <span className="text-[11px] font-mono text-stone-500 mt-2">
          PRESS [ENTER] OR [SPACE] TO START
        </span>
      </div>

      {/* Flat Bottom Control Hint Line */}
      <div className="w-full text-center text-xs font-mono text-stone-500 pt-3 border-t border-stone-800/80">
        <span className="text-stone-400">WASD Move</span>
        <span className="mx-2 text-stone-600">·</span>
        <span className="text-stone-400">Mouse Look</span>
        <span className="mx-2 text-stone-600">·</span>
        <span className="text-stone-400">Space Jump</span>
        <span className="mx-2 text-stone-600">·</span>
        <span className="text-stone-400">Shift Sprint</span>
        <span className="mx-2 text-stone-600">·</span>
        <span className="text-stone-400">Esc Pause</span>
      </div>
    </div>
  );
};
