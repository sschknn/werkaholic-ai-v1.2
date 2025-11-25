import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock für die Services
jest.mock('../services/geminiService', () => ({
  analyzeItemImage: jest.fn(),
  getStoredApiKey: jest.fn(),
  setStoredApiKey: jest.fn()
}));

jest.mock('../services/liveService', () => ({
  LiveService: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendVideoFrame: jest.fn()
  }))
}));

// Mock für localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock für navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: jest.fn()
};
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: mockMediaDevices
  },
  writable: true
});

describe('Error Handling Tests', () => {
  let mockAnalyzeItemImage: jest.Mock;
  let mockGetStoredApiKey: jest.Mock;
  let mockSetStoredApiKey: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock für die Services
    const { analyzeItemImage, getStoredApiKey, setStoredApiKey } = require('../services/geminiService');
    mockAnalyzeItemImage = analyzeItemImage;
    mockGetStoredApiKey = getStoredApiKey;
    mockSetStoredApiKey = setStoredApiKey;

    // Mock für localStorage
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockReturnValue();
    mockLocalStorage.removeItem.mockReturnValue();

    // Mock für erfolgreiche API-Aufrufe
    mockAnalyzeItemImage.mockResolvedValue({
      adData: {
        title: 'Testprodukt',
        description: 'Testbeschreibung',
        category: 'Elektronik',
        priceMin: 10,
        priceMax: 50,
        suggestedPrice: 25,
        keywords: ['test', 'produkt'],
        condition: 'Gut',
        reasoning: 'Automatisch erkannt'
      },
      sources: []
    });
  });

  describe('onAutoAdCreated Fehlerbehandlung', () => {
    test('sollte onAutoAdCreated korrekt aufrufen', async () => {
      render(<App />);

      // Navigiere zum Live Scanner
      fireEvent.click(screen.getByText('Live Scanner'));

      // Warte auf das Rendern der ImageUploader Komponente
      await waitFor(() => {
        expect(screen.getByText('Live Scanner')).toBeInTheDocument();
      });

      // Simuliere Bildauswahl
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any
      };
      
      Object.defineProperty(global, 'FileReader', {
        value: jest.fn(() => mockFileReader),
        writable: true
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      // Simuliere FileReader-Erfolg
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      // Überprüfe, ob onAutoAdCreated korrekt aufgerufen wurde
      // Dies sollte durch die App-Komponente gehandhabt werden
      expect(screen.getByText('Produkt automatisch zu SavedItems hinzugefügt! 🎉')).toBeInTheDocument();
    });

    test('sollte onAutoAdCreated Fehler korrekt handhaben', async () => {
      // Mock für Fehler in onAutoAdCreated
      mockAnalyzeItemImage.mockRejectedValue(new Error('Analyse fehlgeschlagen'));

      render(<App />);

      // Navigiere zum Live Scanner
      fireEvent.click(screen.getByText('Live Scanner'));

      // Warte auf das Rendern
      await waitFor(() => {
        expect(screen.getByText('Live Scanner')).toBeInTheDocument();
      });

      // Simuliere Bildauswahl
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any
      };
      
      Object.defineProperty(global, 'FileReader', {
        value: jest.fn(() => mockFileReader),
        writable: true
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      // Überprüfe, ob Fehler angezeigt wird
      expect(screen.getByText('Analyse fehlgeschlagen')).toBeInTheDocument();
    });
  });

  describe('API Error 404 Behandlung', () => {
    test('sollte API 404 Fehler korrekt handhaben', async () => {
      // Mock für API 404 Fehler
      mockAnalyzeItemImage.mockRejectedValue({
        message: 'API_KEY_INVALID',
        name: 'AuthenticationError'
      });

      render(<App />);

      // Simuliere Bildauswahl
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any
      };
      
      Object.defineProperty(global, 'FileReader', {
        value: jest.fn(() => mockFileReader),
        writable: true
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      // Überprüfe, ob Authentifizierungsfehler angezeigt wird
      expect(screen.getByText('Authentifizierung fehlgeschlagen. Bitte Key prüfen.')).toBeInTheDocument();
    });

    test('sollte Rate Limit Fehler korrekt handhaben', async () => {
      // Mock für Rate Limit Fehler
      mockAnalyzeItemImage.mockRejectedValue({
        message: 'RATE_LIMIT',
        name: 'QuotaExceededError'
      });

      render(<App />);

      // Simuliere Bildauswahl
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any
      };
      
      Object.defineProperty(global, 'FileReader', {
        value: jest.fn(() => mockFileReader),
        writable: true
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      // Überprüfe, ob Rate Limit Fehler angezeigt wird
      expect(screen.getByText('Server ausgelastet. Neuer Versuch in 5s...')).toBeInTheDocument();
    });
  });

  describe('Netzwerkfehlerbehandlung', () => {
    test('sollte Netzwerkfehler korrekt handhaben', async () => {
      // Mock für Netzwerkfehler
      mockAnalyzeItemImage.mockRejectedValue({
        message: 'Network Error',
        name: 'NetworkError'
      });

      render(<App />);

      // Simuliere Bildauswahl
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any
      };
      
      Object.defineProperty(global, 'FileReader', {
        value: jest.fn(() => mockFileReader),
        writable: true
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      // Überprüfe, ob Netzwerkfehler angezeigt wird
      expect(screen.getByText('Fehler bei der Analyse')).toBeInTheDocument();
    });
  });

  describe('Validierungsfehler', () => {
    test('sollte ungültige Dateitypen korrekt handhaben', async () => {
      render(<App />);

      // Simuliere ungültigen Dateityp
      const fileInput = screen.getByLabelText('Bild hochladen');
      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // Überprüfe, ob Fehler angezeigt wird
      expect(screen.getByText('Nur Bilddateien sind erlaubt')).toBeInTheDocument();
    });

    test('sollte zu große Dateien korrekt handhaben', async () => {
      render(<App />);

      // Simuliere zu große Datei
      const fileInput = screen.getByLabelText('Bild hochladen');
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      // Überprüfe, ob Fehler angezeigt wird
      expect(screen.getByText('Datei ist zu groß (max. 5MB)')).toBeInTheDocument();
    });
  });

  describe('Zustandsfehlerbehandlung', () => {
    test('sollte ungültige App-Zustände korrekt handhaben', async () => {
      render(<App />);

      // Simuliere direkten Zustandswechsel
      const appElement = document.querySelector('[data-testid="app"]');
      if (appElement) {
        appElement.setAttribute('data-state', 'INVALID_STATE');
      }

      // Überprüfe, ob die App trotzdem korrekt läuft
      expect(screen.getByText('Foto Scanner')).toBeInTheDocument();
    });

    test('sollte fehlende Bilddaten korrekt handhaben', async () => {
      render(<App />);

      // Simuliere Bildauswahl ohne Bilddaten
      const fileInput = screen.getByLabelText('Bild hochladen');
      const emptyFile = new File([''], 'empty.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [emptyFile] } });

      // Überprüfe, ob Fehler angezeigt wird
      expect(screen.getByText('Datei ist leer')).toBeInTheDocument();
    });
  });

  describe('Timeout Fehlerbehandlung', () => {
    test('sollte Timeout Fehler korrekt handhaben', async () => {
      // Mock für Timeout Fehler
      mockAnalyzeItemImage.mockRejectedValue({
        message: 'Timeout',
        name: 'TimeoutError'
      });

      render(<App />);

      // Simuliere Bildauswahl
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any
      };
      
      Object.defineProperty(global, 'FileReader', {
        value: jest.fn(() => mockFileReader),
        writable: true
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      // Überprüfe, ob Timeout Fehler angezeigt wird
      expect(screen.getByText('Server ausgelastet. Neuer Versuch in 5s...')).toBeInTheDocument();
    });
  });

  describe('Benutzerinteraktionsfehler', () => {
    test('sollte doppelte Klicks korrekt handhaben', async () => {
      render(<App />);

      // Simuliere doppelten Klick auf den gleichen Button
      const liveScannerButton = screen.getByText('Live Scanner');
      
      fireEvent.click(liveScannerButton);
      fireEvent.click(liveScannerButton);

      // Überprüfe, dass keine Fehler auftreten
      expect(screen.getByText('Live Scanner')).toBeInTheDocument();
    });

    test('sollte schnelle Zustandswechsel korrekt handhaben', async () => {
      render(<App />);

      // Simuliere schnelle Zustandswechsel
      fireEvent.click(screen.getByText('Live Scanner'));
      fireEvent.click(screen.getByText('Foto Scanner'));
      fireEvent.click(screen.getByText('Live Scanner'));

      // Überprüfe, dass keine Fehler auftreten
      expect(screen.getByText('Live Scanner')).toBeInTheDocument();
    });
  });

  describe('Speicherfehlerbehandlung', () => {
    test('sollte localStorage Fehler korrekt handhaben', async () => {
      // Mock für localStorage Fehler
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage is full');
      });

      render(<App />);

      // Simuliere Bildauswahl
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any
      };
      
      Object.defineProperty(global, 'FileReader', {
        value: jest.fn(() => mockFileReader),
        writable: true
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      // Überprüfe, ob Speicherfehler angezeigt wird
      expect(screen.getByText('Speicher voll! Alte Einträge löschen.')).toBeInTheDocument();
    });
  });
});