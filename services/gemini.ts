import { GoogleGenAI, Type } from "@google/genai";
import { AppState, HealthStats } from "../types";

export const getAIInsights = async (state: AppState): Promise<string> => {
  try {
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
      Je bent een personal coach. Geef 3 uiterst concrete actiepunten in het Nederlands op basis van deze data:
      ${bioContext}
      Training: ${gymContext}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Log meer data voor persoonlijke inzichten.";
  } catch (error: any) {
    console.error("Gemini Insights Error:", error);
    return "AI Coach tijdelijk niet beschikbaar.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Systeemfout: API Key ontbreekt.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

    // Simpele, dwingende prompt
    const prompt = "Identificeer het eten op de foto. Schat de calorieën en macro's per portie. Als het geen eten is, noem het object maar zet de waarden op 0.";

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

    const resultText = response.text;
    if (!resultText) throw new Error("De AI gaf een leeg antwoord.");
    
    return JSON.parse(resultText);
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    // Geef de echte foutmelding door voor debugging
    throw new Error(error.message || "De AI kon de foto niet verwerken.");
  }
};