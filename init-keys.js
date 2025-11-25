// API Key Initialisierung
// Initialisiert API-Schlüssel aus hartkodierten Werten basierend auf .env.local

// OpenRouter API Key für KI-Textgenerierung
const openRouterKey = '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';

// Google Gemini API Key für Live-Scanner mit Sprachsteuerung  
const geminiKey = 'AIzaSyCG-SNjbf-aCJvaijfoFiRkRSwFogglxDA';

// Schlüssel in localStorage speichern
localStorage.setItem('openrouter_api_key', openRouterKey);
localStorage.setItem('gemini_api_key', geminiKey);

console.log('API Keys wurden in localStorage gespeichert');
console.log('OpenRouter Key gespeichert:', !!openRouterKey);
console.log('Gemini Key gespeichert:', !!geminiKey);