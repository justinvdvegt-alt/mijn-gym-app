
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

    const systemInstruction = `Gedraag je als een expert diëtist en OCR-specialist. 
    
    STRIKTE LOGICA:
    1. OCR PRIORITEIT: Scan de afbeelding eerst op ELKE vorm van tekst. Als er een merknaam (bijv. Coca-Cola, Optimel, Quaker) of specifieke productnaam op staat, gebruik die dan als primaire bron. Gok NOOIT op basis van kleur of vorm als er tekst zichtbaar is die het tegendeel bewijst.
    2. 100G/ML STANDAARD: Geef de voedingswaarden ALTIJD terug op basis van 100 gram (voor vast voedsel) of 100 ml (voor vloeistoffen). Zoek specifiek naar de tabel "Voedingswaarde per 100g/ml".
    3. TYPE DETECTIE: Bepaal of het product vloeibaar ('ml') of vast ('g') is.
    4. ALTIJD RESULTAAT: Geef bij onduidelijkheid een 'best guess' op basis van het meest waarschijnlijke merk/product dat je herkent.

    Reageer uitsluitend in JSON formaat volgens het opgegeven schema.`;

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
            naam: { type: Type.STRING, description: "Naam van het product of merk" },
            type: { type: Type.STRING, description: "Eenheid: 'ml' of 'g'" },
            kcal_100: { type: Type.NUMBER, description: "Calorieën per 100 eenheden" },
            eiwit_100: { type: Type.NUMBER, description: "Eiwit per 100 eenheden" },
            koolhydraten_100: { type: Type.NUMBER, description: "Koolhydraten per 100 eenheden" },
            vet_100: { type: Type.NUMBER, description: "Vet per 100 eenheden" }
          },
          required: ["naam", "type", "kcal_100", "eiwit_100", "koolhydraten_100", "vet_100"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("AI herkenning mislukt. Controleer je internetverbinding en probeer een duidelijkere foto.");
  }
};
