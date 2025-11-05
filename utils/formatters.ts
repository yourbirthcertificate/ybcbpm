export const formatBpm = (bpm: number): string => {
  // Show up to 2 decimal places, but remove ".00" for whole numbers.
  return bpm.toFixed(2).replace(/\.00$/, '');
};

export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

export const formatSampleRate = (sampleRate: number): string => {
    return `${(sampleRate / 1000).toFixed(1)} kHz`;
};

export const formatBitrate = (bitrate: number): string => {
    return `${Math.round(bitrate / 1000)} kbps`;
};
