
export const formatBpm = (bpm: number): string => {
  // If it's effectively a whole number (within a tiny tolerance), don't show decimals.
  if (Math.abs(bpm - Math.round(bpm)) < 0.01) {
    return Math.round(bpm).toString();
  }
  // Otherwise, show up to 2 decimal places.
  return (Math.round(bpm * 100) / 100).toFixed(2);
};
