export interface MusicalInsight {
  genres: string[];
  exampleSongs: {
    title: string;
    artist: string;
  }[];
  mood: string;
}

export interface BpmCandidate {
  tempo: number;
  count: number;
}

export interface TrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  albumArtUrl?: string;
  genre?: string;
  track?: string;
  composer?: string;
}

export interface SongFact {
  facts: string[];
  sources?: {
    uri: string;
    title: string;
  }[];
}

export interface FileInfo {
  duration: number;
  sampleRate: number;
  channels: number;
  size: number;
  bitrate: number;
}

export interface Settings {
  useGemini: boolean;
  debugMode: boolean;
  verboseLogging: boolean;
}

export interface TempoVariability {
  min: number;
  max: number;
  stdDev: number;
}

export interface AnalysisResult {
  candidates: BpmCandidate[];
  peaks: number[];
  tempoVariability: TempoVariability | null;
}
