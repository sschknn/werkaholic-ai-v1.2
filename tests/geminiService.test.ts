import { analyzeItemImage, analyzeProductImage, getStoredApiKey, setStoredApiKey } from '../services/geminiService';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock für GoogleGenerativeAI
jest.mock('@google/generative-ai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Mock für localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn()
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock für environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_GEMINI_KEY: 'test-api-key'
  },
  writable: true
});

describe('GeminiService', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock für GoogleGenerativeAI
    (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue(JSON.stringify({
              title: "Testprodukt",
              description: "Testbeschreibung",
              category: "Elektronik",
              condition: "Gut",
              priceMin: 10,
              priceMax: 50,
              suggestedPrice: 25,
              keywords: ["test", "produkt"],
              reasoning: "Automatisch erkannt"
            }))
          }
        })
      })
    }));
  });

  describe('API Key Management', () => {
    test('sollte API Key korrekt speichern und abrufen', () => {
      const testKey = 'test-api-key-12345';
      
      setStoredApiKey(testKey);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('GEMINI_API_KEY', testKey);
      
      const retrievedKey = getStoredApiKey();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('GEMINI_API_KEY');
      expect(retrievedKey).toBe(testKey);
    });

    test('sollte null zurückgeben wenn kein API Key gespeichert ist', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const retrievedKey = getStoredApiKey();
      expect(retrievedKey).toBeNull();
    });
  });

  describe('analyzeItemImage', () => {
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testMimeType = 'image/png';

    test('sollte Bildanalyse korrekt durchführen', async () => {
      const result = await analyzeItemImage(testImageBase64, testMimeType);

      expect(result).toBeDefined();
      expect(result.adData).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.adData.title).toBe('Testprodukt');
      expect(result.adData.description).toBe('Testbeschreibung');
      expect(result.adData.category).toBe('Elektronik');
      expect(result.adData.priceMin).toBe(10);
      expect(result.adData.priceMax).toBe(50);
      expect(result.adData.suggestedPrice).toBe(25);
      expect(result.adData.keywords).toEqual(['test', 'produkt']);
      expect(result.adData.condition).toBe('Gut');
      expect(result.adData.reasoning).toBe('Automatisch erkannt');
    });

    test('sollte API Fehler korrekt behandeln', async () => {
      // Mock für API Fehler
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue({
            message: 'API_KEY_INVALID'
          })
        })
      }));

      await expect(analyzeItemImage(testImageBase64, testMimeType))
        .rejects
        .toThrow('AUTH_ERROR');
    });

    test('sollte Rate Limit Fehler korrekt behandeln', async () => {
      // Mock für Rate Limit Fehler
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue({
            message: 'RATE_LIMIT'
          })
        })
      }));

      await expect(analyzeItemImage(testImageBase64, testMimeType))
        .rejects
        .toThrow('RATE_LIMIT_ERROR');
    });

    test('sollte Timeout Fehler korrekt behandeln', async () => {
      // Mock für Timeout Fehler
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue({
            message: 'TIMEOUT'
          })
        })
      }));

      await expect(analyzeItemImage(testImageBase64, testMimeType))
        .rejects
        .toThrow('TIMEOUT_ERROR');
    });

    test('sollte ungültige JSON-Antwort korrekt handhaben', async () => {
      // Mock für ungültige JSON-Antwort
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue('Ungültige JSON Antwort')
            }
          })
        })
      }));

      await expect(analyzeItemImage(testImageBase64, testMimeType))
        .rejects
        .toThrow('INVALID_JSON_RESPONSE');
    });

    test('sollte leere Antwort korrekt handhaben', async () => {
      // Mock für leere Antwort
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue('')
            }
          })
        })
      }));

      await expect(analyzeItemImage(testImageBase64, testMimeType))
        .rejects
        .toThrow('EMPTY_RESPONSE');
    });
  });

  describe('analyzeProductImage', () => {
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testMimeType = 'image/png';

    test('sollte Produktanalyse korrekt durchführen', async () => {
      // Mock für Produktanalyse Antwort
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue(JSON.stringify({
                title: "iPhone 14 Pro - Guter Zustand",
                description: "Kurze Produktbeschreibung mit Features und Zustand.",
                price: 599.99,
                category: "Elektronik/Handys"
              }))
            }
          })
        })
      }));

      const result = await analyzeProductImage(testImageBase64, testMimeType);

      expect(result).toBeDefined();
      expect(result.adData).toBeDefined();
      expect(result.adData.title).toBe('iPhone 14 Pro - Guter Zustand');
      expect(result.adData.description).toBe('Kurze Produktbeschreibung mit Features und Zustand.');
      expect(result.adData.suggestedPrice).toBe(599.99);
      expect(result.adData.category).toBe('Elektronik/Handys');
      expect(result.adData.priceMin).toBe(479); // 599.99 * 0.8
      expect(result.adData.priceMax).toBe(720); // 599.99 * 1.2
    });

    test('sollte Fallback-Parse bei ungültigem JSON durchführen', async () => {
      // Mock für ungültige JSON-Antwort mit Fallback-Daten
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue('Ungültige JSON mit "title": "Fallback Titel" und "price": 100')
            }
          })
        })
      }));

      const result = await analyzeProductImage(testImageBase64, testMimeType);

      expect(result).toBeDefined();
      expect(result.adData).toBeDefined();
      expect(result.adData.title).toBe('Fallback Titel');
      expect(result.adData.suggestedPrice).toBe(100);
      expect(result.adData.priceMin).toBe(80); // 100 * 0.8
      expect(result.adData.priceMax).toBe(120); // 100 * 1.2
    });

    test('sollte Standardwerte bei fehlenden Daten verwenden', async () => {
      // Mock für Antwort ohne relevante Daten
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue('Keine relevanten Daten')
            }
          })
        })
      }));

      const result = await analyzeProductImage(testImageBase64, testMimeType);

      expect(result).toBeDefined();
      expect(result.adData).toBeDefined();
      expect(result.adData.title).toBe('Erkanntes Produkt (Fallback)');
      expect(result.adData.suggestedPrice).toBe(50); // Standardwert
      expect(result.adData.category).toBe('Sonstiges');
    });

    test('sollte Performance korrekt loggen', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock für schnelle Antwort
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue(JSON.stringify({
                title: "Schnell getestet",
                description: "Test",
                price: 100,
                category: "Test"
              }))
            }
          })
        })
      }));

      await analyzeProductImage(testImageBase64, testMimeType);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gemini API call completed in')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Multimodale Verarbeitung', () => {
    test('sollte multimodale Inhalte korrekt verarbeiten', async () => {
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const testMimeType = 'image/png';

      // Mock für multimodale Antwort
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue(JSON.stringify({
                title: "Multimodales Produkt",
                description: "Erkannt durch Bild + Text",
                category: "Elektronik",
                price: 200
              }))
            }
          })
        })
      }));

      const result = await analyzeItemImage(testImageBase64, testMimeType);

      expect(result).toBeDefined();
      expect(result.adData.title).toBe('Multimodales Produkt');
      expect(result.adData.description).toBe('Erkannt durch Bild + Text');
    });
  });

  describe('Fehlerbehandlung', () => {
    test('sollte fehlende API Key korrekt behandeln', async () => {
      // Mock für fehlenden API Key
      Object.defineProperty(import.meta, 'env', {
        value: {
          VITE_GEMINI_KEY: undefined
        },
        writable: true
      });

      await expect(analyzeItemImage('test', 'image/png'))
        .rejects
        .toThrow('API_KEY_MISSING');
    });

    test('sollte Netzwerkfehler korrekt behandeln', async () => {
      // Mock für Netzwerkfehler
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue({
            message: 'Network Error'
          })
        })
      }));

      await expect(analyzeItemImage('test', 'image/png'))
        .rejects
        .toThrow('Network Error');
    });
  });

  describe('Performance', () => {
    test('sollte Performance-Metriken korrekt erfassen', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const startTime = Date.now();
      
      await analyzeItemImage('test', 'image/png');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gemini API call completed in')
      );
      
      consoleSpy.mockRestore();
    });
  });
});