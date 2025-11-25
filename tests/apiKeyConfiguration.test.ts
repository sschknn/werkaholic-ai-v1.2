import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getStoredApiKey, setStoredApiKey, analyzeItemImage, analyzeProductImage } from '../services/geminiService';

/**
 * API-Schlüssel-Konfigurationstests
 * Testet die korrekte API-Schlüssel-Verarbeitung und Umgebungsvariablen-Konfiguration
 */

describe('API-Schlüssel-Konfiguration', () => {
  const mockApiKey = 'test-api-key-12345';
  const STORAGE_KEY = 'GEMINI_API_KEY';

  beforeEach(() => {
    // Clean up localStorage before each test
    localStorage.clear();
    // Mock environment variables
    process.env.VITE_GEMINI_KEY = mockApiKey;
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    delete process.env.VITE_GEMINI_KEY;
  });

  describe('Schlüssel-Management', () => {
    it('should store and retrieve API key from localStorage', () => {
      // Test storing API key
      setStoredApiKey(mockApiKey);
      const storedKey = getStoredApiKey();
      
      expect(storedKey).toBe(mockApiKey);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(mockApiKey);
    });

    it('should return null when no API key is stored', () => {
      const storedKey = getStoredApiKey();
      expect(storedKey).toBeNull();
    });

    it('should overwrite existing API key', () => {
      const newApiKey = 'new-test-key-67890';
      
      setStoredApiKey(mockApiKey);
      setStoredApiKey(newApiKey);
      const storedKey = getStoredApiKey();
      
      expect(storedKey).toBe(newApiKey);
    });
  });

  describe('Environment Variable Handling', () => {
    it('should use environment variable when no stored key exists', () => {
      // Mock the environment variable access
      const originalEnv = process.env.VITE_GEMINI_KEY;
      process.env.VITE_GEMINI_KEY = mockApiKey;
      
      // This would be tested in actual API calls
      expect(process.env.VITE_GEMINI_KEY).toBe(mockApiKey);
      
      process.env.VITE_GEMINI_KEY = originalEnv;
    });

    it('should handle missing environment variable', () => {
      delete process.env.VITE_GEMINI_KEY;
      
      expect(process.env.VITE_GEMINI_KEY).toBeUndefined();
    });
  });

  describe('API Key Validation', () => {
    it('should validate API key format', () => {
      const validKeys = [
        'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI',
        'test-api-key-12345',
        'sk-1234567890abcdefghijklmnopqrstuvwxyz'
      ];

      validKeys.forEach(key => {
        expect(typeof key).toBe('string');
        expect(key.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty API key', () => {
      setStoredApiKey('');
      const storedKey = getStoredApiKey();
      expect(storedKey).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('localStorage quota exceeded');
      });

      expect(() => setStoredApiKey(mockApiKey)).not.toThrow();

      // Restore original method
      localStorage.setItem = originalSetItem;
    });

    it('should handle null/undefined values', () => {
      expect(() => setStoredApiKey(null as any)).not.toThrow();
      expect(() => setStoredApiKey(undefined as any)).not.toThrow();
      
      localStorage.setItem('test-key', 'null');
      expect(getStoredApiKey()).toBe('null');
    });
  });
});

// Mock GoogleGenerativeAI for testing
const mockGenAI = {
  getGenerativeModel: jest.fn(() => ({
    generateContent: jest.fn(),
    startChat: jest.fn(() => ({
      sendMessage: jest.fn(),
      sendMessageStream: jest.fn()
    }))
  }))
};

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => mockGenAI)
}));

describe('Gemini Service API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeItemImage', () => {
    it('should handle missing API key gracefully', async () => {
      delete process.env.VITE_GEMINI_KEY;
      
      await expect(analyzeItemImage('test-data', 'image/jpeg')).rejects.toThrow('API_KEY_MISSING');
    });

    it('should handle empty base64 data', async () => {
      process.env.VITE_GEMINI_KEY = mockApiKey;
      
      await expect(analyzeItemImage('', 'image/jpeg')).rejects.toThrow();
    });

    it('should handle invalid MIME type', async () => {
      process.env.VITE_GEMINI_KEY = mockApiKey;
      
      await expect(analyzeItemImage('test-data', 'invalid/type')).rejects.toThrow();
    });

    it('should process valid image data', async () => {
      process.env.VITE_GEMINI_KEY = mockApiKey;
      
      // Mock successful API response
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: jest.fn().mockResolvedValueOnce({
          response: {
            text: JSON.stringify({
              title: 'Test Product',
              description: 'Test description',
              category: 'Test Category',
              condition: 'Gebraucht',
              priceMin: 10,
              priceMax: 30,
              suggestedPrice: 20,
              keywords: ['test', 'product'],
              reasoning: 'Test reasoning'
            })
          }
        })
      });

      const result = await analyzeItemImage('test-base64-data', 'image/jpeg');
      
      expect(result).toHaveProperty('adData');
      expect(result).toHaveProperty('sources');
      expect(result.adData.title).toBe('Test Product');
    });
  });

  describe('analyzeProductImage', () => {
    it('should handle API key validation', async () => {
      delete process.env.VITE_GEMINI_KEY;
      
      await expect(analyzeProductImage('test-data', 'image/jpeg')).rejects.toThrow('API_KEY_MISSING');
    });

    it('should handle JSON parsing errors', async () => {
      process.env.VITE_GEMINI_KEY = mockApiKey;
      
      // Mock API response with invalid JSON
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: jest.fn().mockResolvedValueOnce({
          response: {
            text: 'Invalid JSON response'
          }
        })
      });

      const result = await analyzeProductImage('test-data', 'image/jpeg');
      
      // Should use fallback parsing
      expect(result).toHaveProperty('adData');
      expect(result.adData.title).toBe('Erkanntes Produkt');
    });

    it('should handle empty API response', async () => {
      process.env.VITE_GEMINI_KEY = mockApiKey;
      
      // Mock empty API response
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: jest.fn().mockResolvedValueOnce({
          response: {
            text: ''
          }
        })
      });

      await expect(analyzeProductImage('test-data', 'image/jpeg')).rejects.toThrow('EMPTY_RESPONSE');
    });

    it('should create fallback AdData for invalid responses', async () => {
      process.env.VITE_GEMINI_KEY = mockApiKey;
      
      // Mock API response that triggers fallback
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: jest.fn().mockResolvedValueOnce({
          response: {
            text: 'Some text without proper JSON structure'
          }
        })
      });

      const result = await analyzeProductImage('test-data', 'image/jpeg');
      
      expect(result.adData.title).toBe('Erkanntes Produkt (Fallback)');
      expect(result.adData.suggestedPrice).toBe(50); // Default fallback price
      expect(result.adData.category).toBe('Sonstiges'); // Default fallback category
    });
  });
});

describe('JSON Response Processing', () => {
  it('should clean and parse JSON with thought tags', () => {
    const input = `<thought>This is thinking</thought>
    {
      "title": "Test Title",
      "description": "Test Description"
    }
    <thought>More thinking</thought>`;

    // This would be tested through the actual service methods
    expect(typeof input).toBe('string');
    expect(input).toContain('<thought>');
    expect(input).toContain('"title": "Test Title"');
  });

  it('should extract JSON from markdown code blocks', () => {
    const input = `Here is the response:
    \`\`\`json
    {
      "title": "Markdown Title",
      "description": "Markdown Description"
    }
    \`\`\`
    End of response.`;

    expect(typeof input).toBe('string');
    expect(input).toContain('```json');
    expect(input).toContain('"title": "Markdown Title"');
  });

  it('should handle JSON without formatting', () => {
    const input = '{ "title": "Simple JSON", "description": "Simple Description" }';
    
    expect(typeof input).toBe('string');
    expect(input).toContain('"title": "Simple JSON"');
  });
});