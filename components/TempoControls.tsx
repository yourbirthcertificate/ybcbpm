import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { formatBpm } from '../utils/formatters';
import { logError } from '../services/loggingService';

type BpmVariation = 'half' | 'normal' | 'double';

interface TempoControlsProps {
  audioBuffer: AudioBuffer | null;
  detectedBpm: number;
  activeBpm: number;
  onBpmChange: (newBpm: number) => void;
}

export const TempoControls: React.FC<TempoControlsProps> = ({ audioBuffer, detectedBpm, activeBpm, onBpmChange }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const schedulerIntervalRef = useRef<number | null>(null);
    const nextNoteTimeRef = useRef<number>(0);

    // Setup AudioContext on mount
    useEffect(() => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                logError('Web Audio API is not supported in this browser.', e);
            }
        }
    }, []);

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(0); } catch (e) {}
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        if (schedulerIntervalRef.current) {
            clearInterval(schedulerIntervalRef.current);
            schedulerIntervalRef.current = null;
        }
        setIsPlaying(false);
    }, []);
    
    const scheduleClick = (time: number) => {
        const context = audioContextRef.current;
        if (!context) return;

        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, time);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    const scheduler = useCallback(() => {
        const context = audioContextRef.current;
        if (!context || activeBpm <= 0) return;

        const scheduleAheadTime = 0.1; // seconds
        while (nextNoteTimeRef.current < context.currentTime + scheduleAheadTime) {
            scheduleClick(nextNoteTimeRef.current);
            const secondsPerBeat = 60.0 / activeBpm;
            nextNoteTimeRef.current += secondsPerBeat;
        }
    }, [activeBpm]);

    const handlePlayPause = useCallback(async () => {
        const context = audioContextRef.current;
        if (!context || !audioBuffer) return;

        if (isPlaying) {
            stopPlayback();
        } else {
             if (context.state === 'suspended') {
                await context.resume();
            }
            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.start(0);
            source.onended = stopPlayback;
            audioSourceRef.current = source;
            
            // Start Metronome Scheduler
            nextNoteTimeRef.current = context.currentTime;
            schedulerIntervalRef.current = window.setInterval(scheduler, 25);
            setIsPlaying(true);
        }
    }, [isPlaying, audioBuffer, scheduler, stopPlayback]);
    
    const getButtonClass = (isActive: boolean) => 
        `px-4 py-2 rounded-md transition-colors text-sm font-semibold ${
            isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`;

    const variations = [
      { label: '½ Time', value: detectedBpm / 2},
      { label: 'x1', value: detectedBpm },
      { label: 'x2', value: detectedBpm * 2 },
    ]

    return (
        <div className="mt-4 flex flex-col items-center gap-4">
             <div className="text-center">
                <p className="text-sm text-gray-400">Selected Tempo</p>
                <p className={`text-5xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}>
                    {formatBpm(activeBpm)} <span className="text-2xl">BPM</span>
                </p>
            </div>
            <div className="flex items-center justify-center gap-3 bg-gray-900/50 p-2 rounded-lg">
               {variations.map(v => (
                 <button 
                    key={v.label}
                    onClick={() => onBpmChange(v.value)} 
                    className={getButtonClass(formatBpm(activeBpm) === formatBpm(v.value))}>
                    {v.label}
                  </button>
               ))}
            </div>
            <button
                onClick={handlePlayPause}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg p-3 transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 flex items-center gap-2 w-40 justify-center"
                disabled={!audioBuffer}
                aria-label={isPlaying ? 'Pause Preview' : 'Preview Tempo'}
            >
                {isPlaying ? <><PauseIcon className="w-5 h-5" /> Stop</> : <><PlayIcon className="w-5 h-5" /> Preview</>}
            </button>
        </div>
    );
};