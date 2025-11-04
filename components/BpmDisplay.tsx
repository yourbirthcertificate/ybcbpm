import React, { useState } from 'react';
import { formatBpm } from '../utils/formatters';

interface BpmDisplayProps {
  bpm: number;
}

export const BpmDisplay: React.FC<BpmDisplayProps> = ({ bpm }) => {
  const [showPrecise, setShowPrecise] = useState(false);

  const roundedBpm = Math.round(bpm);
  const preciseBpm = formatBpm(bpm);
  const displayValue = showPrecise ? preciseBpm : roundedBpm;
  
  const hasDecimal = preciseBpm !== roundedBpm.toString();

  return (
    <div 
      className={`text-center ${hasDecimal ? 'cursor-pointer' : ''}`}
      onClick={() => hasDecimal && setShowPrecise(!showPrecise)}
      title={hasDecimal ? (showPrecise ? 'Click to show rounded BPM' : 'Click to show precise BPM') : ''}
    >
      <p className="text-sm text-gray-400">Detected Tempo</p>
      <p className="text-6xl md:text-8xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
        {displayValue}
      </p>
      <p className="text-xl text-gray-300">BPM</p>
    </div>
  );
};