import React, { useRef, useEffect, useCallback, useState } from 'react';
import { logError } from '../services/loggingService';

// --- Icon Components ---
const ZoomInIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11"x2="14" y2="11"></line></svg>
);
const ZoomOutIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
);
const ResetIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 2v6h6"></path><path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path><path d="M21 22v-6h-6"></path><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path></svg>
);


interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null;
  peaks: number[]; // peak positions in seconds
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

const WAVEFORM_HEIGHT = 100;
const PEAK_COLOR = 'rgba(255, 255, 255, 0.5)';
const SCRUBBER_COLOR = '#F87171'; // A bright red/coral

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ audioBuffer, peaks, duration, currentTime, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  
  const [viewRange, setViewRange] = useState({ start: 0, end: 1 }); // Range as a fraction [0, 1]
  const [isPanning, setIsPanning] = useState(false);
  const panStartInfo = useRef({ x: 0, start: 0, moved: false });
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // --- Drawing Logic ---
    const data = audioBuffer.getChannelData(0);
    const viewDuration = (viewRange.end - viewRange.start) * duration;
    const startSample = Math.floor(viewRange.start * duration * audioBuffer.sampleRate);
    const endSample = Math.ceil(viewRange.end * duration * audioBuffer.sampleRate);
    const visibleSamples = endSample - startSample;
    const step = Math.ceil(visibleSamples / width);
    const amp = height / 2;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#585CF8');
    gradient.addColorStop(1, '#A047F8');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        const sampleStartIndex = startSample + i * step;
        for (let j = 0; j < step; j++) {
            const sample = data[sampleStartIndex + j] || 0;
            if (sample < min) min = sample;
            if (sample > max) max = sample;
        }
        if (i === 0) ctx.moveTo(i, (1 + max) * amp);
        else ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        const sampleStartIndex = startSample + i * step;
        for (let j = 0; j < step; j++) {
            const sample = data[sampleStartIndex + j] || 0;
            if (sample < min) min = sample;
            if (sample > max) max = sample;
        }
        if (i === 0) ctx.moveTo(i, (1 + min) * amp);
        else ctx.lineTo(i, (1 + min) * amp);
    }
    ctx.stroke();
    
    // Draw peak markers within view
    ctx.lineWidth = 1;
    ctx.strokeStyle = PEAK_COLOR;
    peaks.forEach(peakTime => {
        if (peakTime >= viewRange.start * duration && peakTime <= viewRange.end * duration) {
            const x = ((peakTime / duration - viewRange.start) / (viewRange.end - viewRange.start)) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    });

    // Draw scrubber if in view
    if (currentTime >= viewRange.start * duration && currentTime <= viewRange.end * duration) {
      const scrubberX = ((currentTime / duration - viewRange.start) / (viewRange.end - viewRange.start)) * width;
      ctx.lineWidth = 2;
      ctx.strokeStyle = SCRUBBER_COLOR;
      ctx.beginPath();
      ctx.moveTo(scrubberX, 0);
      ctx.lineTo(scrubberX, height);
      ctx.stroke();
    }
    ctx.restore();
  }, [audioBuffer, peaks, viewRange, currentTime, duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = parentRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleZoom = (factor: number) => {
    const currentRange = viewRange.end - viewRange.start;
    const center = viewRange.start + currentRange / 2;
    let newRange = currentRange * factor;
    newRange = Math.max(0.001, Math.min(1, newRange));

    let newStart = center - newRange / 2;
    let newEnd = center + newRange / 2;

    if (newStart < 0) {
        newStart = 0;
        newEnd = newRange;
    }
    if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - newRange;
    }
    setViewRange({ start: newStart, end: newEnd });
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    panStartInfo.current = { x: e.clientX, start: viewRange.start, moved: false };
    setIsPanning(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning || !canvasRef.current) return;
    
    if (!panStartInfo.current.moved && Math.abs(e.clientX - panStartInfo.current.x) > 5) {
        panStartInfo.current.moved = true;
    }
    
    if (panStartInfo.current.moved) {
        const deltaX = e.clientX - panStartInfo.current.x;
        const width = canvasRef.current.getBoundingClientRect().width;
        const deltaRange = (deltaX / width) * (viewRange.end - viewRange.start);
        
        let newStart = panStartInfo.current.start - deltaRange;
        newStart = Math.max(0, Math.min(1 - (viewRange.end - viewRange.start), newStart));
        
        setViewRange({ start: newStart, end: newStart + (viewRange.end - viewRange.start) });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && !panStartInfo.current.moved) { // It was a click, not a pan
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickedFraction = x / rect.width;
        const timeFraction = viewRange.start + clickedFraction * (viewRange.end - viewRange.start);
        onSeek(timeFraction * duration);
    }
    setIsPanning(false);
  };
  
  const controlButtonClasses = "bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-md p-1.5 transition-colors backdrop-blur-sm";

  return (
    <div className="w-full h-[100px] relative select-none" ref={parentRef}>
      <canvas 
          ref={canvasRef} 
          className="w-full h-full block rounded-md cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsPanning(false)}
      />
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <button onClick={() => handleZoom(0.5)} className={controlButtonClasses} title="Zoom In"><ZoomInIcon /></button>
        <button onClick={() => handleZoom(2)} className={controlButtonClasses} title="Zoom Out"><ZoomOutIcon /></button>
        <button onClick={() => setViewRange({ start: 0, end: 1 })} className={controlButtonClasses} title="Reset Zoom"><ResetIcon /></button>
      </div>
    </div>
  );
};
