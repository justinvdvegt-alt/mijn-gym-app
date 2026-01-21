
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
    - Leeftijd: ${latestHealth.age}
    - Lengte: ${latestHealth.height}cm
  ` : "Geen biometrie beschikbaar.";

  const prompt = `
    Je bent een wereldklasse personal coach en voedingsdeskundige. Analyseer de volgende data en geef 3 uiterst concrete en motiverende actiepunten in het Nederlands.
    ${bioContext}
    Recente trainingen: ${gymContext}
    Maaltijden vandaag: ${state.mealHistory.length}
    Houd het kort, krachtig en to-the-point.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Begin met het loggen van je data voor persoonlijke AI-inzichten.";
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return "De AI Coach analyseert momenteel je voortgang. Probeer het over een moment opnieuw.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imageData = base64Image.split(',')[1];
  const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

  const prompt = `
    Je bent een expert in visuele voedingsanalyse. Bekijk de afbeelding van deze maaltijd.
    Zelfs als de foto niet perfect is, doe je uiterste best om de ingrediënten en porties te schatten.
    Schat de calorieën (kcal), eiwitten (g), koolhydraten (g) en vetten (g).
    
    ANTWOORD UITSLUITEND IN DIT JSON FORMAAT:
    {
      "name": "Naam van het gerecht",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }
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
    if (!resultText) throw new Error("Geen resultaat van AI");
    
    const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw new Error("AI kon de maaltijd niet goed analyseren. Probeer een andere hoek of betere belichting.");
  }
};
