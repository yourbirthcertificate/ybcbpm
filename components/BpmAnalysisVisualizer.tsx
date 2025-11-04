import React from 'react';
import type { BpmCandidate } from '../types';
import { formatBpm } from '../utils/formatters';

interface BpmAnalysisVisualizerProps {
  candidates: BpmCandidate[];
  detectedBpm: number;
}

export const BpmAnalysisVisualizer: React.FC<BpmAnalysisVisualizerProps> = ({ candidates, detectedBpm }) => {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Take top 7 candidates for visualization
  const topCandidates = candidates.slice(0, 7);
  const maxCount = Math.max(...topCandidates.map(c => c.count));
  const detectedBpmFormatted = formatBpm(detectedBpm);

  return (
    <div className="mt-8 text-left animate-fade-in">
        <h3 className="text-2xl font-bold text-center mb-6">Confidence Analysis</h3>
        <div className="bg-gray-800/80 p-6 rounded-lg flex justify-around items-end h-48 border border-gray-700">
            {topCandidates.map((candidate) => {
                const candidateBpmFormatted = formatBpm(candidate.tempo);
                const isDetected = candidateBpmFormatted === detectedBpmFormatted;
                return (
                    <div key={candidate.tempo} className="flex flex-col items-center h-full justify-end" title={`BPM: ${candidateBpmFormatted} | Score: ${candidate.count}`}>
                        <div 
                            className={`w-8 md:w-10 rounded-t-md transition-all duration-500 ease-out hover:opacity-80 ${isDetected ? 'bg-gradient-to-t from-blue-500 to-purple-500' : 'bg-gray-600'}`}
                            style={{ height: `${(candidate.count / maxCount) * 95}%` }}
                        ></div>
                        <p className={`text-sm mt-2 font-bold ${isDetected ? 'text-blue-300' : 'text-gray-400'}`}>{candidateBpmFormatted}</p>
                    </div>
                )
            })}
        </div>
         <p className="text-center text-gray-500 text-xs mt-2">Visualization of the most likely BPM candidates.</p>
    </div>
  );
};
