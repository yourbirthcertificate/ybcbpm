import React from 'react';
import { formatBpm } from '../utils/formatters';
import type { TempoVariability } from '../types';

interface BpmDisplayProps {
  bpm: number;
  tempoVariability: TempoVariability | null;
  year?: string;
  firstBeatTime?: number;
  isUserDefined: boolean;
  isAdjusting: boolean;
  onAdjustClick: () => void;
  onCancelAdjust: () => void;
  onResetBeat: () => void;
  musicalKey?: string | null;
  keyConfidence?: number;
}

const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

export const BpmDisplay: React.FC<BpmDisplayProps> = ({ bpm, tempoVariability, year, firstBeatTime, isUserDefined, isAdjusting, onAdjustClick, onCancelAdjust, onResetBeat, musicalKey, keyConfidence }) => {
  const showVariability = tempoVariability && tempoVariability.stdDev > 1.2 && (tempoVariability.max - tempoVariability.min > 2.5);
  const isOldSong = year && parseInt(year, 10) < 1975;
  const showExtraInfo = showVariability || (firstBeatTime && firstBeatTime > 0);
  
  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-6 md:gap-8">
        <div>
            <p className="text-sm text-slate-400 tracking-[0.3em] uppercase">Detected Tempo</p>
            <p className="text-6xl md:text-8xl font-bold tracking-tighter bg-gradient-to-r from-blue-300 via-sky-300 to-purple-400 text-transparent bg-clip-text drop-shadow-[0_18px_45px_rgba(59,130,246,0.25)]">
                {formatBpm(bpm)}
            </p>
            <p className="text-xl text-slate-300">BPM</p>
        </div>

        {musicalKey && (
            <div className="pb-2 md:pb-3 border-l-2 border-white/10 pl-6 md:pl-8">
                <p className="text-sm text-slate-400 tracking-[0.3em] uppercase">Estimated Key</p>
                <p className="text-4xl md:text-5xl font-bold tracking-tighter bg-gradient-to-r from-blue-300 via-sky-300 to-purple-400 text-transparent bg-clip-text">
                    {musicalKey.replace(' major', '').replace(' minor', 'm')}
                </p>
                 <p className="text-md text-slate-300">
                    {musicalKey.includes('major') ? 'Major' : 'Minor'}
                    {typeof keyConfidence === 'number' && ` (${Math.round(keyConfidence * 100)}% conf.)`}
                </p>
            </div>
        )}
      </div>

      {showExtraInfo && (
          <div className="mt-6 pt-4 border-t border-white/10 space-y-4 animate-fade-in text-sm text-center">
              {showVariability && (
                  <div>
                      <h4 className="font-bold text-slate-200 flex items-center justify-center gap-2">
                          <InfoIcon className="text-sky-300" />
                          Variable Tempo Detected
                      </h4>
                      <p className="text-slate-300 max-w-xs mx-auto">
                          This track's tempo fluctuates, ranging from <span className="font-semibold text-slate-100 font-mono">{formatBpm(tempoVariability.min)}</span> to <span className="font-semibold text-slate-100 font-mono">{formatBpm(tempoVariability.max)}</span> BPM. The primary BPM is an average and may not be perfectly accurate for the entire track.
                      </p>
                      {isOldSong && (
                        <p className="text-xs text-slate-500 italic pt-2 max-w-xs mx-auto">
                            Note: Tempo variation is common for songs from this era (pre-click track).
                        </p>
                      )}
                  </div>
              )}
               {firstBeatTime && firstBeatTime > 0 && (
                <div className="text-center">
                    {isAdjusting ? (
                        <div className="bg-blue-900/40 border border-blue-500/50 rounded-lg px-3 py-2 max-w-xs mx-auto">
                            <p className="font-semibold text-blue-200">Adjustment Mode Active</p>
                            <p className="text-xs text-blue-300/80">Click the waveform to set the first beat.</p>
                             <button onClick={onCancelAdjust} className="mt-2 text-xs bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-full py-1 px-3 transition-colors">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-slate-300">
                                {isUserDefined ? <span className="text-purple-300 font-semibold">User-set</span> : 'Auto-detected'} first beat at: <span className="font-semibold text-slate-100 font-mono">{firstBeatTime.toFixed(2)}s</span>
                            </p>
                            <div className="flex justify-center items-center gap-3 text-xs mt-1.5">
                                <button onClick={onAdjustClick} className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-blue-300 transition-colors font-semibold">
                                    {isUserDefined ? 'Re-adjust' : 'Adjust'}
                                </button>
                                {isUserDefined && (
                                    <button onClick={onResetBeat} className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                                        Reset to Auto
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
              )}
          </div>
      )}
    </div>
  );
};