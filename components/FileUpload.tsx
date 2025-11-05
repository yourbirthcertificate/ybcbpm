
import React, { useState, useCallback } from 'react';
import { MusicIcon } from './icons/MusicIcon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileSelect(event.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileSelect]);
  
  const dragActiveClasses = isDragging
    ? 'border-blue-400/80 shadow-[0_0_45px_rgba(59,130,246,0.35)] scale-[1.01]'
    : 'border-white/10';
  const containerStateClass = isDragging ? 'file-upload-hover' : '';

  return (
    <div
      className={`file-upload-zone ${containerStateClass} relative overflow-hidden flex flex-col items-center justify-center p-8 border-2 border-dashed ${dragActiveClasses} rounded-2xl transition-all duration-300 text-center cursor-pointer bg-slate-900/60 backdrop-blur-xl`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="file-upload-glow"></div>
      <MusicIcon className="w-16 h-16 text-blue-300 mb-4 drop-shadow-[0_0_18px_rgba(56,189,248,0.35)]" />
      <h3 className="text-2xl font-semibold text-white">
        Drop your audio file here or <span className="text-blue-300">browse</span>
      </h3>
      <p className="text-slate-300 mt-2 max-w-sm">Supports MP3, FLAC, WAV, OGG & more. Drag & drop to feel the magic.</p>
    </div>
  );
};
