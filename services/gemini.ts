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
      Je bent een wereldklasse personal coach. Geef 3 uiterst concrete en motiverende actiepunten in het Nederlands op basis van deze data:
      ${bioContext}
      Training: ${gymContext}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Begin met het loggen van je stats voor persoonlijke inzichten.";
  } catch (error: any) {
    console.error("Gemini Insights Error:", error);
    return "De AI Coach is bezig met je analyse. Voeg meer data toe!";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key niet gevonden. Controleer de instellingen in Vercel.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

    const prompt = `
      Je bent een expert voedingsdeskundige. Analyseer deze foto grondig.
      Zelfs als de foto niet perfect scherp is of van een afstand is genomen, doe je uiterste best om te herkennen wat er op staat.
      
      Als het eten is: Geef de specifieke naam en een realistische schatting van kcal, eiwit, koolhydraten en vetten per portie.
      Als het GEEN eten is: Geef bij 'name' aan wat het wel is (bijv. "Een toetsenbord"), maar zet de voedingswaarden op 0.
      
      ANTWOORD ALTIJD STRIKT IN DIT JSON FORMAAT:
      {
        "name": "Naam van het gerecht",
        "calories": 500,
        "protein": 30,
        "carbs": 50,
        "fats": 20
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
    if (!resultText) throw new Error("Geen resultaat van de AI.");
    
    return JSON.parse(resultText);
  } catch (error: any) {
    console.error("Gemini Scan Error:", error);
    throw new Error("De AI kon de maaltijd niet herkennen. Probeer een foto van iets dichterbij met meer licht.");
  }
};