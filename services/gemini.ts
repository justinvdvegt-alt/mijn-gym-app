
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, HealthStats } from "../types";

/**
 * Gemini AI Service
 * Gebruikt uitsluitend de veilige process.env.API_KEY.
 */

export const getAIInsights = async (state: AppState): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    return "AI-coach configuratie nodig: Voeg 'API_KEY' toe aan je Vercel Environment Variables en doe een Redeploy.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const latestHealth: HealthStats | undefined = state.healthHistory[state.healthHistory.length - 1];
    const workouts = state.workouts || [];
    const gymContext = workouts.slice(-3).map(w => `${w.label}: ${w.exercises.length} sets`).join(', ');
    
    const bioContext = latestHealth ? `Gebruiker: ${latestHealth.weight}kg, Doel: ${latestHealth.goal}.` : "";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Je bent een high-performance fitness coach. Geef 3 uiterst korte, krachtige tips in het Nederlands op basis van deze data: ${bioContext} Recente trainingen: ${gymContext}. Focus op progressieve overload en consistentie.`,
    });
    
    return response.text || "Blijf je data loggen voor nieuwe inzichten!";
  } catch (error: any) {
    console.error("Gemini Insights Error:", error);
    if (error.message?.includes('API key not found')) {
      return "Fout: API-sleutel niet gevonden in de server-omgeving.";
    }
    return "De AI coach is tijdelijk niet bereikbaar. Controleer je internetverbinding.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    throw new Error("API_KEY ontbreekt. Ga naar Vercel Settings -> Environment Variables, voeg 'API_KEY' toe en doe een Redeploy.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

    const prompt = "Identificeer dit eten en geef een schatting van de voedingswaarden. Reageer uitsluitend in JSON formaat.";

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
            name: { type: Type.STRING, description: "Naam van het gerecht" },
            calories: { type: Type.NUMBER, description: "Totaal aantal calorieën" },
            protein: { type: Type.NUMBER, description: "Eiwitten in gram" },
            carbs: { type: Type.NUMBER, description: "Koolhydraten in gram" },
            fats: { type: Type.NUMBER, description: "Vetten in gram" }
          },
          required: ["name", "calories", "protein", "carbs", "fats"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("De AI kon geen resultaat genereren.");
    
    return JSON.parse(resultText);
  } catch (error: any) {
    console.error("Meal Analysis Error:", error);
    if (error.message?.includes('leaked')) {
      throw new Error("Deze sleutel is door Google geblokkeerd. Gebruik een nieuwe en deel deze nooit in chats of code.");
    }
    throw new Error(error.message || "Analyse mislukt. Controleer je API instellingen in Vercel.");
  }
};
