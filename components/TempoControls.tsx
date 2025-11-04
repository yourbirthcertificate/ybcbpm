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
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

export const TempoControls: React.FC<TempoControlsProps> = ({ audioBuffer, detectedBpm, activeBpm, onBpmChange, currentTime, onTimeUpdate }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPrecise, setShowPrecise] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const metronomeSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const gainNodeRef = useRef<GainNode | null>(null);
    const playbackStartTimeRef = useRef(0);
    const startOffsetRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);

    const schedulerIntervalRef = useRef<number | null>(null);
    const nextNoteTimeRef = useRef<number>(0);

    // Setup AudioContext on mount
    useEffect(() => {
        if (!audioContextRef.current) {
            try {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = context;
                gainNodeRef.current = context.createGain();
                gainNodeRef.current.connect(context.destination);
            } catch (e) {
                logError('Web Audio API is not supported in this browser.', e);
            }
        }
        return () => {
             stopPlayback();
             audioContextRef.current?.close();
        }
    }, []);

    // Effect to handle seeking from parent
    useEffect(() => {
        if (Math.abs(currentTime - startOffsetRef.current) > 0.2) {
            startOffsetRef.current = currentTime;
            if (isPlaying) {
                stopPlayback(false); // don't reset isPlaying state
                startPlayback(currentTime);
            }
        }
    }, [currentTime]);

    const stopPlayback = useCallback((updateState = true) => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (schedulerIntervalRef.current) {
            clearInterval(schedulerIntervalRef.current);
            schedulerIntervalRef.current = null;
        }

        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.onended = null;
                audioSourceRef.current.stop(0);
            } catch (e) {}
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        
        if (updateState) {
            setIsPlaying(false);
        }
    }, []);
    
    const tick = useCallback(() => {
        if (isPlaying && audioContextRef.current) {
            const elapsedTime = audioContextRef.current.currentTime - playbackStartTimeRef.current;
            const newTime = startOffsetRef.current + elapsedTime;
            onTimeUpdate(newTime);

            if (audioBuffer && newTime >= audioBuffer.duration) {
                stopPlayback();
                startOffsetRef.current = audioBuffer.duration;
            } else {
                 animationFrameRef.current = requestAnimationFrame(tick);
            }
        }
    }, [isPlaying, onTimeUpdate, audioBuffer, stopPlayback]);

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
    };

    const scheduler = useCallback(() => {
        const context = audioContextRef.current;
        if (!context || activeBpm <= 0) return;
        const scheduleAheadTime = 0.1; // seconds
        while (nextNoteTimeRef.current < context.currentTime + scheduleAheadTime) {
            scheduleClick(nextNoteTimeRef.current);
            nextNoteTimeRef.current += 60.0 / activeBpm;
        }
    }, [activeBpm]);

    const startPlayback = useCallback(async (offset: number) => {
        const context = audioContextRef.current;
        if (!context || !audioBuffer || !gainNodeRef.current) return;
        if (context.state === 'suspended') await context.resume();

        stopPlayback(false);
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNodeRef.current);
        source.start(0, offset);
        
        audioSourceRef.current = source;
        startOffsetRef.current = offset;
        playbackStartTimeRef.current = context.currentTime;

        // Metronome
        nextNoteTimeRef.current = context.currentTime;
        schedulerIntervalRef.current = window.setInterval(scheduler, 25);
        
        setIsPlaying(true);
        animationFrameRef.current = requestAnimationFrame(tick);

        source.onended = () => {
            if (audioSourceRef.current === source) {
                 stopPlayback();
            }
        };

    }, [audioBuffer, tick, scheduler, stopPlayback]);
    
    const handlePlayPause = useCallback(async () => {
        if (isPlaying) {
            // Update offset before stopping
            if (audioContextRef.current) {
                const elapsedTime = audioContextRef.current.currentTime - playbackStartTimeRef.current;
                startOffsetRef.current = startOffsetRef.current + elapsedTime;
            }
            stopPlayback();
        } else {
            let offset = startOffsetRef.current;
            if (audioBuffer && offset >= audioBuffer.duration - 0.01) {
                offset = 0;
            }
            onTimeUpdate(offset);
            startPlayback(offset);
        }
    }, [isPlaying, audioBuffer, stopPlayback, startPlayback, onTimeUpdate]);
    
    const getButtonClass = (isActive: boolean) => 
        `px-4 py-2 rounded-md transition-colors text-sm font-semibold ${
            isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`;

    const variations = [
      { label: '½ Time', value: detectedBpm / 2},
      { label: 'x1', value: detectedBpm },
      { label: 'x2', value: detectedBpm * 2 },
    ]

    const roundedActiveBpm = Math.round(activeBpm);
    const preciseActiveBpm = formatBpm(activeBpm);
    const hasDecimal = preciseActiveBpm.includes('.');
    const displayValue = showPrecise ? preciseActiveBpm : roundedActiveBpm;

    return (
        <div className="mt-4 flex flex-col items-center gap-4">
             <div 
                className={`text-center ${hasDecimal ? 'cursor-pointer' : ''}`}
                onClick={() => hasDecimal && setShowPrecise(!showPrecise)}
                title={hasDecimal ? (showPrecise ? 'Click to show rounded BPM' : 'Click to show precise BPM') : ''}
            >
                <p className="text-sm text-gray-400">Selected Tempo</p>
                <p className={`text-5xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}>
                    {displayValue} <span className="text-2xl">BPM</span>
                </p>
            </div>
            <div className="flex items-center justify-center gap-3 bg-gray-900/50 p-2 rounded-lg">
               {variations.map(v => (
                 <button 
                    key={v.label}
                    onClick={() => {
                        stopPlayback();
                        startOffsetRef.current = currentTime;
                        onBpmChange(v.value)
                    }} 
                    className={getButtonClass(Math.round(activeBpm) === Math.round(v.value))}>
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