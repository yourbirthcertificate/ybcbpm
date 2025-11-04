

export const formatBpm = (bpm: number): string => {
  // Show up to 2 decimal places, but remove ".00" for whole numbers.
  return bpm.toFixed(2).replace(/\.00$/, '');
};