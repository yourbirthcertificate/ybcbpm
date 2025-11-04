import React, { useRef, useEffect, useCallback } from 'react';
import { logError } from '../services/loggingService';

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null;
  peaks: number[]; // peak positions in seconds
}

const WAVEFORM_HEIGHT = 100;
const WAVEFORM_COLOR = '#4A90E2'; // A nice blue
const PEAK_COLOR = 'rgba(255, 255, 255, 0.5)';

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ audioBuffer, peaks }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const draw = useCallback((buffer: AudioBuffer, peakMarkers: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#585CF8');
    gradient.addColorStop(1, '#A047F8');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = gradient;

    // Draw waveform
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, amp);
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    // Draw peak markers
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = PEAK_COLOR;
    const duration = buffer.duration;
    peakMarkers.forEach(peakTime => {
        const x = (peakTime / duration) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    });

  }, []);

  const parentRef = useCallback((node: HTMLDivElement) => {
    if (node !== null && canvasRef.current) {
      try {
        const { width } = node.getBoundingClientRect();
        canvasRef.current.width = width * window.devicePixelRatio;
        canvasRef.current.height = WAVEFORM_HEIGHT * window.devicePixelRatio;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${WAVEFORM_HEIGHT}px`;
        
        const ctx = canvasRef.current.getContext('2d');
        ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);

        if (audioBuffer) {
          draw(audioBuffer, peaks);
        }
      } catch (e) {
        logError('Error setting up canvas', e);
      }
    }
  }, [audioBuffer, peaks, draw]);


  return (
    <div className="w-full h-[100px] relative" ref={parentRef}>
      <canvas ref={canvasRef} className="w-full h-full block rounded-md" />
    </div>
  );
};
