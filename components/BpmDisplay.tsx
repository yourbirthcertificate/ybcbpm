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
      <p className="text-sm text-gray-400">Detected Tempo</p>
      <p className="text-6xl md:text-8xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
        {formatBpm(bpm)}
      </p>
      <p className="text-xl text-gray-300">BPM</p>

      {showVariability && (
          <div className="mt-6 pt-4 border-t border-gray-700/50 space-y-2 animate-fade-in text-sm">
              <h4 className="font-bold text-gray-200">Tempo Drift Detected</h4>
              <div className="flex justify-center items-center gap-x-6 gap-y-1 flex-wrap">
                  <div>
                      <span className="text-gray-400">Variation: </span>
                      <span className="font-semibold text-white">{getVariabilityDescription(tempoVariability.stdDev)}</span>
                  </div>
                   <div>
                      <span className="text-gray-400">Range: </span>
                      <span className="font-semibold text-white font-mono">{formatBpm(tempoVariability.min)} - {formatBpm(tempoVariability.max)}</span>
                  </div>
              </div>
              {isOldSong && (
                <p className="text-xs text-gray-500 italic pt-2">
                    Note: Tempo variation is common for songs from this era (pre-click track).
                </p>
              )}
          </div>
      )}
    </div>
  );
};