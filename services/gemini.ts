
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
    Je bent een wereldklasse personal coach. Geef 3 uiterst concrete en motiverende actiepunten in het Nederlands op basis van deze data:
    ${bioContext}
    Training: ${gymContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Log je stats voor persoonlijke inzichten.";
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return "AI Coach is bezig met analyse. Probeer het over een moment opnieuw.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imageData = base64Image.split(',')[1];
  const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

  const prompt = `
    Je bent een expert voedingsanalist. Analyseer deze maaltijd. 
    BELANGRIJK: Zelfs als de foto wazig of onduidelijk is, doe je best om te schatten wat er op het bord ligt. 
    Geef NOOIT een foutmelding over de beeldkwaliteit, geef altijd je beste schatting.
    
    ANTWOORD ENKEL IN JSON:
    {
      "name": "Naam van de maaltijd",
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
    if (!resultText) throw new Error("Leeg resultaat");
    const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw new Error("AI kon de foto niet direct herkennen. Probeer het opnieuw of pas de belichting aan.");
  }
};
