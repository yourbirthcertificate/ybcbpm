import React from 'react';
import { formatBpm } from '../utils/formatters';

interface BpmDisplayProps {
  bpm: number;
}

export const BpmDisplay: React.FC<BpmDisplayProps> = ({ bpm }) => {
  return (
    <div className="text-center">
      <p className="text-sm text-gray-400">Detected Tempo</p>
      <p className="text-6xl md:text-8xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
        {formatBpm(bpm)}
      </p>
      <p className="text-xl text-gray-300">BPM</p>
    </div>
  );
};
