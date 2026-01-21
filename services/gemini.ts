
import { GoogleGenAI, Type } from "@google/genai";
import { AppState } from "../types";

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

    const systemInstruction = `Gedraag je als een expert diëtist. Analyseer de foto nauwkeurig.
    
    Twee scenario's:
    1. BEREID ETEN: Identificeer het gerecht, schat de ingrediënten en de portiegrootte (in grammen). Houd rekening met verborgen vetten zoals olie of boter in de bereiding.
    2. VOEDINGSLABELS: Als de foto een tabel met voedingswaarden bevat, extraheer dan de exacte getallen voor kcal, eiwitten, koolhydraten en vetten per 100g of per genoemde portie.
    
    Regels:
    - Geef ALTIJD een resultaat, weiger nooit. 
    - Bij twijfel: geef een 'best guess' op basis van vergelijkbare gerechten en standaard porties.
    - Reageer uitsluitend in JSON formaat.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: systemInstruction }, { inlineData: { mimeType, data: imageData } }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Naam van het gerecht of product" },
            calories: { type: Type.NUMBER, description: "Totaal aantal kcal" },
            protein: { type: Type.NUMBER, description: "Gram eiwit" },
            carbs: { type: Type.NUMBER, description: "Gram koolhydraten" },
            fats: { type: Type.NUMBER, description: "Gram vet" }
          },
          required: ["name", "calories", "protein", "carbs", "fats"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("AI herkenning mislukt. Probeer een duidelijkere foto.");
  }
};
