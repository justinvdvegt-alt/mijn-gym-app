import { GoogleGenAI, Type } from "@google/genai";
import { AppState, HealthStats } from "../types";

export const getAIInsights = async (state: AppState): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const latestHealth: HealthStats | undefined = state.healthHistory[state.healthHistory.length - 1];
  const workouts = state.workouts || [];
  const gymContext = workouts.slice(-5).map(w => `${w.label}: ${w.exercises.length} sets`).join('\n');
  
  const bioContext = latestHealth ? `
    Gebruiker Profiel:
    - Lengte: ${latestHealth.height}cm
    - Leeftijd: ${latestHealth.age}
    - Huidig Gewicht: ${latestHealth.weight}kg
    - Doel: ${latestHealth.goal}
    - Doel Kcal: ${latestHealth.calories}
    - Doel Eiwit: ${latestHealth.protein}g
  ` : "Geen biometrie beschikbaar.";

  const prompt = `
    Je bent een expert personal coach. Analyseer deze data en stel een kort, concreet plan of inzicht voor.
    ${bioContext}
    
    Recente trainingen:
    ${gymContext}
    
    Maaltijden vandaag: ${state.mealHistory.length}
    
    Geef 3 korte, krachtige actiepunten in het Nederlands die de gebruiker helpen bij hun doel (${latestHealth?.goal || 'algemene fitness'}). 
    Noem indien relevant hun BMI of caloriebalans.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Voer data in voor een persoonlijk plan.";
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return "AI Coach is momenteel aan het rusten.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extraheer mimeType uit de base64 string
  const mimeTypeMatch = base64Image.match(/^data:(image\/[a-z]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
  const imageData = base64Image.split(',')[1];

  const prompt = `
    Analyseer deze foto van een maaltijd heel nauwkeurig. 
    Schat de hoeveelheid calorieën en macro-nutriënten in op basis van de zichtbare porties.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageData } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Een smakelijke naam voor het gedetecteerde gerecht.",
            },
            calories: {
              type: Type.NUMBER,
              description: "Totaal aantal kcal.",
            },
            protein: {
              type: Type.NUMBER,
              description: "Gram eiwit.",
            },
            carbs: {
              type: Type.NUMBER,
              description: "Gram koolhydraten.",
            },
            fats: {
              type: Type.NUMBER,
              description: "Gram vetten.",
            },
            fiber: {
              type: Type.NUMBER,
              description: "Gram vezels.",
            }
          },
          required: ["name", "calories", "protein", "carbs", "fats"]
        }
      }
    });

    const resultText = response.text?.trim() || '{}';
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini Scan Detailed Error:", error);
    throw error;
  }
};