
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
    
    Geef 3 korte, krachtige actiepunten in het Nederlands die de gebruiker helpen bij hun doel. 
    Wees motiverend maar eerlijk.
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
  
  const mimeTypeMatch = base64Image.match(/^data:(image\/[a-z]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
  const imageData = base64Image.split(',')[1];

  const prompt = `
    Identificeer het gerecht op de foto en schat de macro's in. 
    Focus op nauwkeurigheid voor calorieën en eiwitten. 
    Geef antwoord in strikt JSON formaat.
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
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            fiber: { type: Type.NUMBER }
          },
          required: ["name", "calories", "protein", "carbs", "fats"]
        }
      }
    });

    const resultText = response.text?.trim();
    if (!resultText) throw new Error("Lege respons van AI");
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw error;
  }
};
