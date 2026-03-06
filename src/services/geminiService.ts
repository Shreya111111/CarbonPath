import { GoogleGenAI, Type } from "@google/genai";
import { UserActivity, Activity } from "../types";
import { ACTIVITIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIRecommendation {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  estimatedSaving: string;
  visualKeyword: string; // A keyword for a relevant image (e.g., "bicycle", "solar panels")
}

export interface AIInsightsResponse {
  score: number; // 0-100, where 100 is best (lowest footprint)
  summary: string;
  recommendations: AIRecommendation[];
  dailyChallenge: string;
}

export interface ParsedActivity {
  activityId: string;
  value: number;
}

export async function parseJournalEntry(text: string): Promise<ParsedActivity[]> {
  const prompt = `Analyze the following journal entry and extract activities related to carbon footprint: "${text}".
  
  Available activities and their units:
  ${ACTIVITIES.map(a => `- ${a.id}: ${a.name} (Unit: ${a.unit})`).join("\n")}
  
  Return a JSON array of objects with 'activityId' and 'value'. 
  Only include activities that are explicitly mentioned or can be reasonably inferred with a quantity.
  If no activities are found, return an empty array [].`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              activityId: { type: Type.STRING },
              value: { type: Type.NUMBER },
            },
            required: ["activityId", "value"],
          },
        },
      },
    });

    const resultText = response.text;
    if (!resultText) return [];
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error parsing journal entry:", error);
    return [];
  }
}

export async function getAIRecommendations(userActivities: UserActivity[]): Promise<AIInsightsResponse | null> {
  if (userActivities.length === 0) return null;

  const activityDetails = userActivities.map(ua => {
    const activity = ACTIVITIES.find(a => a.id === ua.activityId);
    return `${activity?.name}: ${ua.value} ${activity?.unit} (${(ua.value * (activity?.emissionFactor || 0)).toFixed(2)} kg CO2)`;
  }).join(", ");

  const prompt = `As an expert sustainability consultant, analyze the following daily activities and their carbon footprint: ${activityDetails}. 
  
  Provide a comprehensive sustainability report in JSON format:
  1. 'score': A sustainability score from 0 to 100 (100 being excellent/low footprint, 0 being very high). Base this on a typical daily average of 12-15kg CO2.
  2. 'summary': A 2-sentence encouraging summary of their current impact.
  3. 'recommendations': An array of 3-4 personalized, actionable objects with 'title', 'description', 'impact' (high/medium/low), 'estimatedSaving' (e.g., "1.2 kg"), and 'visualKeyword' (a single descriptive noun for a relevant high-quality photo, e.g., "forest", "cycling", "salad", "train").
  4. 'dailyChallenge': A specific, fun "Eco-Challenge" for today based on their data.

  Return ONLY the JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  estimatedSaving: { type: Type.STRING },
                  visualKeyword: { type: Type.STRING },
                },
                required: ["title", "description", "impact", "estimatedSaving", "visualKeyword"],
              },
            },
            dailyChallenge: { type: Type.STRING },
          },
          required: ["score", "summary", "recommendations", "dailyChallenge"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching AI recommendations:", error);
    return null;
  }
}
