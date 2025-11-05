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
    <div className="animate-fade-in">
        <h3 className="text-2xl font-bold text-center mb-6">Confidence Analysis</h3>
        <div className="glass-card p-4 md:p-6 rounded-3xl flex justify-around items-end h-40 border border-white/10">
            {topCandidates.map((candidate) => {
                const candidateBpmFormatted = formatBpm(candidate.tempo);
                const isDetected = candidateBpmFormatted === detectedBpmFormatted;
                return (
                    <div key={candidate.tempo} className="flex flex-col items-center h-full justify-end" title={`BPM: ${candidateBpmFormatted} | Score: ${candidate.count}`}>
                        <div
                            className={`w-6 md:w-8 rounded-t-lg transition-all duration-500 ease-out hover:opacity-90 ${isDetected ? 'bg-gradient-to-t from-sky-500 via-blue-500 to-purple-500 shadow-[0_20px_35px_rgba(56,189,248,0.35)]' : 'bg-slate-600/70'}`}
                            style={{ height: `${(candidate.count / maxCount) * 95}%` }}
                        ></div>
                        <p className={`text-sm mt-2 font-semibold ${isDetected ? 'text-blue-200' : 'text-slate-400'}`}>{candidateBpmFormatted}</p>
                    </div>
                )
            })}
        </div>
         <p className="text-center text-slate-500 text-xs mt-2">Visualization of the most likely BPM candidates.</p>
    </div>
  );
};