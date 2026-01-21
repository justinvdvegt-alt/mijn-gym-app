
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, HealthStats } from "../types";

export const getAIInsights = async (state: AppState): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey.length < 5) return "AI-coach configuratie nodig.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const latestHealth = state.healthHistory[state.healthHistory.length - 1];
    const gymContext = state.workouts?.slice(-3).map(w => `${w.label}: ${w.exercises.length} sets`).join(', ');
    const bioContext = latestHealth ? `Leeftijd: ${latestHealth.age}, Gewicht: ${latestHealth.weight}kg, Lengte: ${latestHealth.height}cm, Doel: ${latestHealth.goal}.` : "";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Je bent een high-performance fitness coach. Geef 3 uiterst korte, krachtige tips in het Nederlands op basis van deze data: ${bioContext} Recente trainingen: ${gymContext}. Focus op progressieve overload en consistentie.`,
    });
    return response.text || "Lekker bezig, blijf loggen!";
  } catch (error) {
    return "De AI coach is tijdelijk offline.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") throw new Error("API_KEY ontbreekt.");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

    // Ultra-specifieke prompt voor verpakkingen, flesjes en labels
    const prompt = `Identificeer dit item nauwkeurig. 
    Het kan zijn:
    1. Eten op een bord (schat portiegrootte).
    2. Een flesje drinken (zoek naar merknaam/label).
    3. Een verpakking, zakje of bakje (zoek naar logo's of teksten als '250g' of 'Eiwitrijk').
    4. Een supplement of fruit.
    
    Bepaal de calorieën en macro's (eiwit, koolh, vet) zo precies mogelijk op basis van de visuele informatie en merkkennis. Reageer uitsluitend in JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: prompt }, { inlineData: { mimeType, data: imageData } }]
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

    return JSON.parse(response.text);
  } catch (error) {
    throw new Error("AI herkenning mislukt. Probeer een duidelijkere foto van het label of de verpakking.");
  }
};
