import { GoogleGenAI, Type } from '@google/genai';
import type { MusicalInsight } from '../types';
import { logError } from './loggingService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        genres: {
            type: Type.ARRAY,
            description: "A list of 2-4 common music genres typically found at this tempo.",
            items: { type: Type.STRING }
        },
        exampleSongs: {
            type: Type.ARRAY,
            description: "A list of 3 well-known example songs at or very near this tempo.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the song." },
                    artist: { type: Type.STRING, description: "The artist of the song." }
                },
                required: ["title", "artist"]
            }
        },
        mood: {
            type: Type.STRING,
            description: "A brief, one-sentence description of the general mood or feeling this tempo evokes (e.g., 'energetic and danceable', 'calm and reflective')."
        }
    },
    required: ["genres", "exampleSongs", "mood"]
};


export const getMusicalInsights = async (bpm: number): Promise<MusicalInsight> => {
    try {
        const prompt = `You are a music expert. The tempo of a song is ${bpm} BPM. Provide a brief analysis of this tempo. Include common music genres, three well-known example songs, and the general mood this tempo evokes.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        return parsedJson as MusicalInsight;
    } catch (error) {
        logError("Error fetching musical insights from Gemini API", error);
        throw new Error("Failed to get musical insights from Gemini.");
    }
};