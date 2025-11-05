
import React from 'react';
import type { MusicalInsight } from '../types';

interface MusicalInsightsProps {
  insights: MusicalInsight;
}

const InsightCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="glass-card p-5 md:p-6 rounded-2xl border border-white/10">
        <h4 className="text-md font-semibold text-slate-200 mb-2">{title}</h4>
        {children}
    </div>
);


export const MusicalInsights: React.FC<MusicalInsightsProps> = ({ insights }) => {
  return (
    <div className="mt-8 text-left animate-fade-in">
        <h3 className="text-2xl font-bold text-center mb-6 text-slate-100">Musical Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard title="Common Genres">
                <ul className="list-disc list-inside text-slate-300">
                    {insights.genres.map((genre) => <li key={genre}>{genre}</li>)}
                </ul>
            </InsightCard>

            <InsightCard title="General Mood">
                <p className="text-slate-300">{insights.mood}</p>
            </InsightCard>

            <div className="md:col-span-2">
                 <InsightCard title="Example Songs">
                    <ul className="space-y-2 text-slate-300">
                        {insights.exampleSongs.map((song) => (
                            <li key={song.title}>
                                <span className="font-semibold text-slate-100">{song.title}</span> by {song.artist}
                            </li>
                        ))}
                    </ul>
                </InsightCard>
            </div>
        </div>
    </div>
  );
};
