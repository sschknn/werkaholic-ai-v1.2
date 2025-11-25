
import { AdData, AnalysisResult, GroundingSource } from "../types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const STORAGE_KEY_OPENROUTER = "OPENROUTER_API_KEY";

// Simplified to reliable free models
const FREE_MODELS = [
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-flash-1.5-8b:free",
  "qwen/qwen-2-vl-7b-instruct:free",
];

// --- Key Management ---

export const getStoredApiKey = (): string | null => {
  const key = localStorage.getItem(STORAGE_KEY_OPENROUTER);
  console.log('[DEBUG] geminiService.getStoredApiKey():', {
    keyFound: !!key,
    keyLength: key?.length,
    storageKey: STORAGE_KEY_OPENROUTER,
    timestamp: new Date().toISOString()
  });
  
  if (!key) {
    console.warn('[DEBUG] WARNUNG: Kein OpenRouter API Key gefunden im localStorage!');
    console.log('[DEBUG] Verfügbare localStorage Keys:', Object.keys(localStorage));
  }
  
  return key;
};

export const setStoredApiKey = (key: string) => {
  localStorage.setItem(STORAGE_KEY_OPENROUTER, key);
};

/**
 * Extracts JSON from a string that might contain Markdown or <thought> tags.
 */
function cleanAndParseJSON(text: string): any {
  if (!text) throw new Error("Empty response text");

  let cleaned = text;

  // 1. Remove <thought> tags (often used by thinking models)
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/g, '');

  // 2. Extract JSON block if wrapped in markdown code fence
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1];
  } else {
    // 3. Fallback: Try to find the first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error. Cleaned:", cleaned);
    throw new Error("INVALID_JSON_RESPONSE");
  }
}

/**
 * Helper to call OpenRouter with model fallback support and rate limit handling.
 */
async function callAIWithFallback(messages: any[], temperature: number = 0.4) {
  const openRouterKey = getStoredApiKey();
  
  if (!openRouterKey || openRouterKey.trim() === "") {
      throw new Error("API_KEY_MISSING");
  }
  
  // Additional validation for key format
  if (!openRouterKey.startsWith("sk-or-") || openRouterKey.length < 50) {
      throw new Error("API_KEY_INVALID");
  }

  let lastError = null;

  // Try OpenRouter models in order
  for (const modelId of FREE_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://kleinanzeigen-genius.app",
          "X-Title": "Kleinanzeigen Genius",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          temperature: temperature,
          response_format: { type: "json_object" }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) throw new Error("AUTH_ERROR");
        if (response.status === 429) {
            console.warn(`Rate limit on ${modelId}. Next model...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
        }
        
        lastError = new Error(`API Error ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.error) {
        if (data.error.code === 401) throw new Error("AUTH_ERROR");
        // Rate limit logic
        if (data.error.code === 429) {
             await new Promise(resolve => setTimeout(resolve, 2000));
             continue;
        }
        lastError = new Error(data.error.message);
        continue;
      }

      const content = data.choices[0]?.message?.content;
      if (!content) {
        lastError = new Error("EMPTY_RESPONSE");
        continue;
      }
      
      return content;

    } catch (error: any) {
      if (error.message === "AUTH_ERROR") throw error;
      console.warn(`Error on ${modelId}:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("Verbindung fehlgeschlagen");
}

/**
 * Analyzes an image to generate classified ad content.
 */
export const analyzeItemImage = async (
  base64Data: string,
  mimeType: string
): Promise<AnalysisResult> => {
  
  const prompt = `
  Analysiere das Bild und erstelle ein perfektes eBay Kleinanzeigen Inserat (Deutsch).

  Wenn Details (wie genaue Modellnummer, GB Speicher, Defekte) nicht sichtbar sind:
  1. Schätze das Wahrscheinlichste (z.B. Standardmodell, Guter Zustand).
  2. Schreibe den Text so, dass der Verkäufer es leicht anpassen kann.

  ANFORDERUNGEN:
  - Titel: Max 60 Zeichen, prägnant, inkl. Keywords.
  - Beschreibung: Emotionaler Einstieg, Bulletpoints für Features, Ehrlicher Zustand, Call-to-Action.
  - Preis: Realistische Schätzung für gebraucht. Sei nicht zu billig.

  JSON OUTPUT FORMAT (Strikt):
  {
    "title": "Titel",
    "description": "Beschreibungstext...",
    "category": "Kategorie",
    "condition": "Gebraucht/Neu/Defekt",
    "priceMin": 10,
    "priceMax": 30,
    "suggestedPrice": 20,
    "keywords": ["Tag1", "Tag2"],
    "reasoning": "Warum dieser Preis?"
  }
  `;

  try {
    const content = await callAIWithFallback([
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ]
      }
    ], 0.3);

    const adData: AdData = cleanAndParseJSON(content);
    return { adData, sources: [] };

  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};
