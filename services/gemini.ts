
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
    return "AI Coach is momenteel aan het rusten.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyseer deze foto van een maaltijd. 
    Schat de voedingswaarden zo nauwkeurig mogelijk in.
    Reageer ALLEEN met een JSON object in dit formaat:
    {
      "name": "Naam van gerecht",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fats": number,
      "fiber": number
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text?.trim() || '{}';
    const result = JSON.parse(resultText);
    return result;
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw error;
  }
};
