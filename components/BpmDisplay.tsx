import React from 'react';
import { formatBpm } from '../utils/formatters';
import type { TempoVariability } from '../types';

interface BpmDisplayProps {
  bpm: number;
  tempoVariability: TempoVariability | null;
  year?: string;
}

const getVariabilityDescription = (stdDev: number): string => {
    if (stdDev < 0.5) return 'Very Stable';
    if (stdDev < 1.5) return 'Stable';
    if (stdDev < 3.0) return 'Slightly Variable';
    return 'High Variation';
};


export const BpmDisplay: React.FC<BpmDisplayProps> = ({ bpm, tempoVariability, year }) => {
  const showVariability = tempoVariability && tempoVariability.stdDev > 0.75 && (tempoVariability.max - tempoVariability.min > 1.5);
  const isOldSong = year && parseInt(year, 10) < 1975;
  
  return (
    <div className="text-center">
      <p className="text-sm text-slate-400 tracking-[0.3em] uppercase">Detected Tempo</p>
      <p className="text-6xl md:text-8xl font-bold tracking-tighter bg-gradient-to-r from-blue-300 via-sky-300 to-purple-400 text-transparent bg-clip-text drop-shadow-[0_18px_45px_rgba(59,130,246,0.25)]">
        {formatBpm(bpm)}
      </p>
      <p className="text-xl text-slate-300">BPM</p>

      {showVariability && (
          <div className="mt-6 pt-4 border-t border-white/10 space-y-2 animate-fade-in text-sm">
              <h4 className="font-bold text-slate-200">Tempo Drift Detected</h4>
              <div className="flex justify-center items-center gap-x-6 gap-y-1 flex-wrap">
                  <div>
                      <span className="text-slate-400">Variation: </span>
                      <span className="font-semibold text-slate-100">{getVariabilityDescription(tempoVariability.stdDev)}</span>
                  </div>
                   <div>
                      <span className="text-slate-400">Range: </span>
                      <span className="font-semibold text-slate-100 font-mono">{formatBpm(tempoVariability.min)} - {formatBpm(tempoVariability.max)}</span>
                  </div>
              </div>
              {isOldSong && (
                <p className="text-xs text-slate-500 italic pt-2">
                    Note: Tempo variation is common for songs from this era (pre-click track).
                </p>
              )}
          </div>
      )}
    </div>
  );
};