/**
 * API Key Service - Verwaltet die API-Schlüssel für die Anwendung
 */

// OpenRouter API Key
export const initializeOpenRouterKey = (apiKey: string) => {
  if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY' && apiKey.length > 10) {
    try {
      localStorage.setItem('OPENROUTER_API_KEY', apiKey);
      console.log('OpenRouter API Key aus Umgebungsvariable geladen');
      return true;
    } catch (error) {
      console.warn('Konnte OpenRouter API Key nicht in localStorage speichern:', error);
      return false;
    }
  }
  return false;
};

// Google API Key für Live Service
export const initializeGoogleApiKey = (apiKey: string) => {
  if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY' && apiKey.length > 10) {
    try {
      localStorage.setItem('GOOGLE_API_KEY', apiKey);
      console.log('Google API Key aus Umgebungsvariable geladen');
      return true;
    } catch (error) {
      console.warn('Konnte Google API Key nicht in localStorage speichern:', error);
      return false;
    }
  }
  return false;
};

// Initialisiert alle API-Schlüssel
export const initializeApiKeys = (openRouterKey?: string, googleApiKey?: string) => {
  const results = [];
  
  if (openRouterKey) {
    results.push(initializeOpenRouterKey(openRouterKey));
  }
  
  if (googleApiKey) {
    results.push(initializeGoogleApiKey(googleApiKey));
  }
  
  return results.every(result => result === true);
};