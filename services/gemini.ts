
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
    
    FOCUS:
    1. TEKST PRIORITEIT: Scan eerst op voedingslabels/etiketten. Als er een tabel zichtbaar is, gebruik die data exact.
    2. DRANK DETECTIE: Als het een vloeistof is, identificeer de drank en gebruik 'ml' als eenheid.
    3. STANDAARDWAARDEN: Geef voedingswaarden ALTIJD terug per 100 eenheden (100g voor vast voedsel, 100ml voor vloeistof).
    4. TYPE DETECTIE: Bepaal of de eenheid 'g' of 'ml' moet zijn.
    
    Regels:
    - Geef ALTIJD een resultaat, weiger nooit. 
    - Bij twijfel over een label: geef een 'best guess' per 100g op basis van vergelijkbare producten.
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
            name: { type: Type.STRING, description: "Naam van het product" },
            caloriesPer100: { type: Type.NUMBER, description: "Kcal per 100 eenheden" },
            proteinPer100: { type: Type.NUMBER, description: "Eiwit per 100 eenheden" },
            carbsPer100: { type: Type.NUMBER, description: "Koolhydraten per 100 eenheden" },
            fatsPer100: { type: Type.NUMBER, description: "Vet per 100 eenheden" },
            unit: { type: Type.STRING, description: "'g' of 'ml'" }
          },
          required: ["name", "caloriesPer100", "proteinPer100", "carbsPer100", "fatsPer100", "unit"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("AI herkenning mislukt. Probeer een duidelijkere foto.");
  }
};
