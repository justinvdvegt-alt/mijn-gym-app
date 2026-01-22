
import { GoogleGenAI, Type } from "@google/genai";
import { AppState } from "../types";

export const getAIInsights = async (state: AppState): Promise<string> => {
  try {
    /* Always initialize with process.env.API_KEY directly */
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const latestHealth = state.healthHistory[state.healthHistory.length - 1];
    const gymContext = state.workouts?.slice(-3).map(w => `${w.label}: ${w.exercises.length} sets`).join(', ');
    const bioContext = latestHealth ? `Leeftijd: ${latestHealth.age}, Gewicht: ${latestHealth.weight}kg, Lengte: ${latestHealth.height}cm, Doel: ${latestHealth.goal}.` : "";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Je bent een high-performance fitness coach. Geef 3 uiterst korte, krachtige tips in het Nederlands op basis van deze data: ${bioContext} Recente trainingen: ${gymContext}. Focus op progressieve overload en consistentie.`,
    });
    return response.text || "Lekker bezig, blijf loggen!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "De AI coach is tijdelijk offline.";
  }
};

export const analyzeMealImage = async (base64Image: string) => {
  try {
    /* Always initialize with process.env.API_KEY directly */
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

    const systemInstruction = `Gedraag je als een expert diëtist en OCR-specialist. 
    
    STRIKTE LOGICA:
    1. TEKST OVER BEELD: Scan de afbeelding eerst op ELKE vorm van tekst. Als er een label/voedingswaardetabel zichtbaar is, MOET je die getallen gebruiken (per 100g/ml).
    2. FOCUS OP 100: Geef NOOIT het totaal van de hele fles of het hele bord. Geef ALTIJD de voedingswaarde per 100ml (voor drinken) of 100g (voor eten).
    3. PRODUCTHERKENNING: Gebruik tekst/merkherkenning (bijv. "Optimel", "Coca-Cola") om het product te benoemen. Gok NOOIT op kleur als er tekst is.

    Reageer uitsluitend in JSON formaat volgens het opgegeven schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ inlineData: { mimeType, data: imageData } }]
      },
      config: {
        /* Use systemInstruction in config as per standard practices */
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            product_naam: { type: Type.STRING, description: "Naam van het product of merk" },
            eenheid: { type: Type.STRING, description: "Eenheid: 'ml' of 'g'" },
            kcal_per_100: { type: Type.NUMBER, description: "Calorieën per 100 eenheden" },
            eiwit_per_100: { type: Type.NUMBER, description: "Eiwit per 100 eenheden" },
            koolhydraten_per_100: { type: Type.NUMBER, description: "Koolhydraten per 100 eenheden" },
            vet_per_100: { type: Type.NUMBER, description: "Vet per 100 eenheden" }
          },
          /* Fixed required field names to match schema properties exactly */
          required: ["product_naam", "eenheid", "kcal_per_100", "eiwit_per_100", "koolhydraten_per_100", "vet_per_100"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("AI herkenning mislukt. Maak een duidelijkere foto van het label.");
  }
};
