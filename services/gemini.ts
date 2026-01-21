
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, HealthStats } from "../types";

export const getAIInsights = async (state: AppState): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const latestHealth: HealthStats | undefined = state.healthHistory[state.healthHistory.length - 1];
  const workouts = state.workouts || [];
  const gymContext = workouts.slice(-5).map(w => `${w.label}: ${w.exercises.length} sets`).join('\n');
  
  const bioContext = latestHealth ? `
    Gebruiker Profiel:
    - Gewicht: ${latestHealth.weight}kg
    - Doel: ${latestHealth.goal}
    - Doel Kcal: ${latestHealth.calories}
  ` : "Geen biometrie beschikbaar.";

  const prompt = `
    Je bent een expert personal coach. Analyseer deze data en stel 3 korte, krachtige actiepunten voor in het Nederlands.
    ${bioContext}
    Training: ${gymContext}
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
  
  const imageData = base64Image.split(',')[1];
  const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

  const prompt = `
    Identificeer de maaltijd en schat de macro's. 
    GEEF ENKEL JSON TERUG. GEEN TEKST ERVOOR OF ERNA.
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
            fats: { type: Type.NUMBER }
          },
          required: ["name", "calories", "protein", "carbs", "fats"]
        }
      }
    });

    const resultText = response.text?.trim();
    if (!resultText) throw new Error("Lege respons");
    
    // Verwijder eventuele markdown code blokken als Gemini ze toch stuurt
    const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw error;
  }
};
