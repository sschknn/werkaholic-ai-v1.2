// API Key Initialisierung
// Liest API-Schlüssel aus Umgebungsvariablen oder nutzt Fallback-Keys

console.log('[DEBUG] init-keys.js gestartet');

try {
  // Versuche, Keys aus Umgebungsvariablen zu lesen
  const envOpenRouterKey = window.env?.VITE_OPENROUTER_KEY || window.VITE_OPENROUTER_KEY;
  const envGeminiKey = window.env?.VITE_GEMINI_KEY || window.VITE_GEMINI_KEY;
  
  console.log('[DEBUG] Umgebungsvariablen gelesen:', {
    openRouterFromEnv: !!envOpenRouterKey,
    geminiFromEnv: !!envGeminiKey,
    openRouterLength: envOpenRouterKey?.length,
    geminiLength: envGeminiKey?.length
  });

  // Fallback auf hartkodierte Keys falls keine Umgebungsvariablen verfügbar
  const openRouterKey = envOpenRouterKey || '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';
  const geminiKey = envGeminiKey || 'AIzaSyCG-SNjbf-aCJvaijfoFiRkRSwFogglxDA';

  console.log('[DEBUG] Keys definiert, speichere in localStorage...');
  console.log('[DEBUG] OpenRouter Key Quelle:', envOpenRouterKey ? 'Umgebungsvariable' : 'Fallback');
  console.log('[DEBUG] Gemini Key Quelle:', envGeminiKey ? 'Umgebungsvariable' : 'Fallback');

  // Schlüssel in localStorage speichern
  localStorage.setItem('OPENROUTER_API_KEY', openRouterKey);
  localStorage.setItem('GOOGLE_API_KEY', geminiKey);

  // Direkte Überprüfung der gespeicherten Werte
  const storedOpenRouter = localStorage.getItem('OPENROUTER_API_KEY');
  const storedGemini = localStorage.getItem('GOOGLE_API_KEY');

  console.log('[DEBUG] API Keys wurden in localStorage gespeichert');
  console.log('[DEBUG] OpenRouter Key gespeichert:', !!storedOpenRouter, 'Länge:', storedOpenRouter?.length);
  console.log('[DEBUG] Gemini Key gespeichert:', !!storedGemini, 'Länge:', storedGemini?.length);
  
  if (!storedOpenRouter || !storedGemini) {
    console.error('[DEBUG] FEHLER: Ein oder beide Keys konnten nicht gespeichert werden!');
  }
  
  // Warnung bei Verwendung von Fallback-Keys
  if (!envOpenRouterKey) {
    console.warn('[DEBUG] WARNUNG: OpenRouter Key aus Fallback, bitte gültigen Key in Umgebungsvariablen setzen!');
  }
  if (!envGeminiKey) {
    console.warn('[DEBUG] WARNUNG: Gemini Key aus Fallback, bitte gültigen Key in Umgebungsvariablen setzen!');
  }
  
} catch (error) {
  console.error('[DEBUG] FEHLER in init-keys.js:', error);
}