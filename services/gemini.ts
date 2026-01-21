import { GoogleGenAI, Type } from "@google/genai";
import { AppState, HealthStats } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API-sleutel niet geconfigureerd in de omgeving.");
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
      Gebruiker: ${latestHealth.weight}kg, Doel: ${latestHealth.goal}, ${latestHealth.age} jaar.
    ` : "";

    const prompt = `Geef 3 korte fitness tips in het Nederlands: ${bioContext} Trainingen: ${gymContext}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Log data voor tips.";
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    return "AI Coach is even offline.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  try {
    const ai = getAIClient();
    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

    const prompt = `
      Analyseer dit eten. Geef ALTIJD een JSON schatting terug, zelfs bij matige kwaliteit.
      JSON: { "name": string, "calories": number, "protein": number, "carbs": number, "fats": number }
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

    const resultText = response.text;
    if (!resultText) throw new Error("Leeg antwoord van de AI.");
    
    return JSON.parse(resultText);
  } catch (error: any) {
    console.error("Meal Analysis Error:", error);
    if (error.message?.includes('leaked')) {
      throw new Error("De API-sleutel is geblokkeerd door Google wegens een lek. Neem contact op met de beheerder.");
    }
    throw new Error(error.message || "De AI kon de maaltijd niet herkennen.");
  }
};