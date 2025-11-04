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
