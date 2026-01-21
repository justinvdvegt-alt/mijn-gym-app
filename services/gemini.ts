
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, HealthStats } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Geen API-sleutel gevonden. Controleer de instellingen.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getAIInsights = async (state: AppState): Promise<string> => {
  try {
    const ai = getAIClient();
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
      Je bent een wereldklasse personal coach. Geef 3 uiterst concrete en motiverende actiepunten in het Nederlands op basis van deze data:
      ${bioContext}
      Training: ${gymContext}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Begin met het loggen van je stats.";
  } catch (error: any) {
    console.error("Gemini Insights Error:", error);
    return error.message || "De AI Coach is tijdelijk niet bereikbaar.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  try {
    const ai = getAIClient();
    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

    const prompt = `
      Je bent een expert voedingsanalist. Analyseer deze maaltijd. 
      Zelfs als de foto wazig is, geef je beste schatting van de calorieën en macro's.
      ANTWOORD ENKEL IN JSON:
      {
        "name": "Naam van de maaltijd",
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fats": 0
      }
    `;

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
    if (!resultText) throw new Error("Leeg resultaat van AI");
    const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Gemini Scan Error:", error);
    throw new Error(error.message || "AI kon de maaltijd niet herkennen.");
  }
};
