import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock für die Services
jest.mock('../services/geminiService', () => ({
  analyzeItemImage: jest.fn(),
  analyzeProductImage: jest.fn(),
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

jest.mock('../services/storageService', () => ({
  downloadBackup: jest.fn(),
  importBackupFromFile: jest.fn()
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

// Mock für FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  onload: null as any,
  onerror: null as any
};
Object.defineProperty(global, 'FileReader', {
  value: jest.fn(() => mockFileReader),
  writable: true
});

// Mock für URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url'),
  writable: true
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true
});

describe('Integration Tests', () => {
  let mockAnalyzeItemImage: jest.Mock;
  let mockAnalyzeProductImage: jest.Mock;
  let mockGetStoredApiKey: jest.Mock;
  let mockSetStoredApiKey: jest.Mock;
  let mockDownloadBackup: jest.Mock;
  let mockImportBackupFromFile: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock für die Services
    const { analyzeItemImage, analyzeProductImage, getStoredApiKey, setStoredApiKey } = require('../services/geminiService');
    const { downloadBackup, importBackupFromFile } = require('../services/storageService');
    
    mockAnalyzeItemImage = analyzeItemImage;
    mockAnalyzeProductImage = analyzeProductImage;
    mockGetStoredApiKey = getStoredApiKey;
    mockSetStoredApiKey = setStoredApiKey;
    mockDownloadBackup = downloadBackup;
    mockImportBackupFromFile = importBackupFromFile;

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

    mockAnalyzeProductImage.mockResolvedValue({
      adData: {
        title: 'Live-Scan Produkt',
        description: 'Live-Scan Beschreibung',
        category: 'Elektronik',
        priceMin: 15,
        priceMax: 45,
        suggestedPrice: 30,
        keywords: ['live', 'scan'],
        condition: 'Gut',
        reasoning: 'Live-Scan erkannt'
      },
      sources: []
    });

    mockImportBackupFromFile.mockResolvedValue([
      {
        id: 'backup-1',
        timestamp: Date.now(),
        adData: {
          title: 'Backup Produkt',
          description: 'Backup Beschreibung',
          category: 'Elektronik',
          priceMin: 20,
          priceMax: 60,
          suggestedPrice: 40,
          keywords: ['backup'],
          condition: 'Gut',
          reasoning: 'Backup'
        },
        sources: [],
        imageData: 'backup-image'
      }
    ]);
  });

  describe('End-to-End Workflow', () => {
    test('sollte kompletten Foto-Scanner Workflow durchführen', async () => {
      render(<App />);

      // Schritt 1: Foto Scanner starten
      expect(screen.getByText('Foto Scanner')).toBeInTheDocument();
      expect(screen.getByText('Foto machen oder hochladen für automatische Inserat-Erstellung')).toBeInTheDocument();

      // Schritt 2: Bild hochladen
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      // Simuliere FileReader-Erfolg
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalledWith('data:image/jpeg;base64,test', 'image/jpeg');
      });

      // Schritt 3: FrageModal anzeigen
      expect(screen.getByText('In welchem Zustand ist das Gerät?')).toBeInTheDocument();

      // Schritt 4: Fragen beantworten
      fireEvent.click(screen.getByText('Überspringen'));

      // Schritt 5: Ergebnis anzeigen
      await waitFor(() => {
        expect(screen.getByText('Testprodukt')).toBeInTheDocument();
        expect(screen.getByText('Testbeschreibung')).toBeInTheDocument();
      });

      // Schritt 6: Speichern
      fireEvent.click(screen.getByText('Speichern'));

      // Überprüfe, ob gespeichert wurde
      expect(screen.getByText('Lokal gespeichert')).toBeInTheDocument();
    });

    test('sollte kompletten Live-Scanner Workflow durchführen', async () => {
      render(<App />);

      // Schritt 1: Live Scanner starten
      fireEvent.click(screen.getByText('Live Scanner'));

      // Warte auf das Rendern
      await waitFor(() => {
        expect(screen.getByText('Live Scanner')).toBeInTheDocument();
        expect(screen.getByText('Echtzeit-Analyse & Sprachsteuerung mit Gemini Live')).toBeInTheDocument();
      });

      // Schritt 2: Bild hochladen
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Warte auf die Verarbeitung
      await waitFor(() => {
        expect(mockAnalyzeProductImage).toHaveBeenCalledWith('data:image/jpeg;base64,test', 'image/jpeg');
      });

      // Schritt 3: Automatische Inserat-Erstellung
      fireEvent.click(screen.getByText('Automatisches Inserat erstellen'));

      // Schritt 4: Ergebnis anzeigen
      await waitFor(() => {
        expect(screen.getByText('Live-Scan Produkt')).toBeInTheDocument();
        expect(screen.getByText('Live-Scan Beschreibung')).toBeInTheDocument();
      });

      // Schritt 5: Speichern
      fireEvent.click(screen.getByText('Speichern'));

      // Überprüfe, ob gespeichert wurde
      expect(screen.getByText('Lokal gespeichert')).toBeInTheDocument();
    });
  });

  describe('Komponenten Integration', () => {
    test('sollte Sidebar Navigation korrekt integrieren', async () => {
      render(<App />);

      // Teste Navigation zwischen verschiedenen Ansichten
      fireEvent.click(screen.getByText('Foto Scanner'));
      expect(screen.getByText('Foto Scanner')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Live Scanner'));
      expect(screen.getByText('Live Scanner')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Gespeichert'));
      expect(screen.getByText('Gespeichert')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Markt Übersicht'));
      expect(screen.getByText('Markt Übersicht')).toBeInTheDocument();

      // Überprüfe, dass alle Navigationen korrekt funktionieren
      expect(screen.getByText('Foto Scanner')).toBeInTheDocument();
    });

    test('sollte Settings Integration korrekt handhaben', async () => {
      render(<App />);

      // Öffne Settings
      fireEvent.click(screen.getByText('Einstellungen'));

      // Überprüfe, ob Settings korrekt geladen wird
      expect(screen.getByText('Einstellungen')).toBeInTheDocument();

      // Teste Backup Download
      fireEvent.click(screen.getByText('Backup herunterladen'));
      expect(mockDownloadBackup).toHaveBeenCalled();

      // Teste Backup Import
      const importFile = new File(['backup content'], 'backup.json', { type: 'application/json' });
      const fileInput = screen.getByLabelText('Backup importieren');
      fireEvent.change(fileInput, { target: { files: [importFile] } });

      expect(mockImportBackupFromFile).toHaveBeenCalledWith(importFile);
      expect(screen.getByText('1 Einträge importiert')).toBeInTheDocument();
    });

    test('sollte SavedItems Integration korrekt handhaben', async () => {
      render(<App />);

      // Füge ein gespeichertes Element hinzu
      fireEvent.click(screen.getByText('Live Scanner'));

      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      await waitFor(() => {
        expect(mockAnalyzeProductImage).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Automatisches Inserat erstellen'));
      await waitFor(() => {
        expect(screen.getByText('Live-Scan Produkt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Speichern'));

      // Navigiere zu SavedItems
      fireEvent.click(screen.getByText('Gespeichert'));

      // Überprüfe, ob gespeicherte Elemente angezeigt werden
      expect(screen.getByText('Live-Scan Produkt')).toBeInTheDocument();

      // Teste Element Auswahl
      fireEvent.click(screen.getByText('Live-Scan Produkt'));

      // Überprüfe, ob zurück zum Editor navigiert wird
      expect(screen.getByText('Live-Scan Produkt')).toBeInTheDocument();
    });
  });

  describe('Live-Scanner Integration', () => {
    test('sollte Live-Scanner mit Video-Stream integrieren', async () => {
      render(<App />);

      // Starte Live Scanner
      fireEvent.click(screen.getByText('Live Scanner'));

      // Mock für Video-Stream
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getVideoTracks: () => [{ kind: 'video' }]
      });

      // Simuliere Kamera-Aktivierung
      fireEvent.click(screen.getByText('Kamera starten'));

      // Überprüfe, ob Mikrofonzugriff angefordert wird
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ 
        audio: false,
        video: true 
      });
    });

    test('sollte Live-Scanner mit Spracherkennung integrieren', async () => {
      render(<App />);

      // Starte Live Scanner
      fireEvent.click(screen.getByText('Live Scanner'));

      // Mock für Audio-Stream
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getAudioTracks: () => [{ kind: 'audio' }]
      });

      // Simuliere Spracherkennung
      fireEvent.click(screen.getByText('Spracherkennung starten'));

      // Überprüfe, ob Audio-Verarbeitung initialisiert wird
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ 
        audio: true,
        video: false 
      });
    });
  });

  describe('Datenpersistenz', () => {
    test('sollte Daten korrekt in localStorage speichern', async () => {
      render(<App />);

      // Füge ein Element hinzu
      fireEvent.click(screen.getByText('Live Scanner'));

      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      await waitFor(() => {
        expect(mockAnalyzeProductImage).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText('Automatisches Inserat erstellen'));
      await waitFor(() => {
        expect(screen.getByText('Live-Scan Produkt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Speichern'));

      // Überprüfe, ob localStorage aufgerufen wurde
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'kleinanzeigen-saved-items',
        expect.any(String)
      );
    });

    test('sollte Daten korrekt aus localStorage laden', () => {
      // Mock für gespeicherte Daten
      const savedData = [
        {
          id: 'test-1',
          timestamp: Date.now(),
          adData: {
            title: 'Gespeichertes Produkt',
            description: 'Gespeicherte Beschreibung',
            category: 'Elektronik',
            priceMin: 10,
            priceMax: 50,
            suggestedPrice: 25,
            keywords: ['gespeichert'],
            condition: 'Gut',
            reasoning: 'Gespeichert'
          },
          sources: [],
          imageData: 'saved-image'
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedData));

      render(<App />);

      // Überprüfe, ob gespeicherte Daten geladen werden
      expect(screen.getByText('Gespeichertes Produkt')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    test('sollte Performance korrekt überwachen', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<App />);

      // Simuliere Bildverarbeitung mit Timing
      const startTime = Date.now();
      
      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing time')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Benutzererfahrung', () => {
    test('sollte responsive Design korrekt handhaben', async () => {
      render(<App />);

      // Teste mobile Ansicht
      window.innerWidth = 768;
      window.dispatchEvent(new Event('resize'));

      // Überprüfe, ob mobile Navigation funktioniert
      expect(screen.getByText('Foto Scanner')).toBeInTheDocument();

      // Teste Desktop Ansicht
      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));

      // Überprüfe, ob Desktop Navigation funktioniert
      expect(screen.getByText('Foto Scanner')).toBeInTheDocument();
    });

    test('sollte Loading States korrekt anzeigen', async () => {
      render(<App />);

      // Mock für langsame Bildverarbeitung
      mockAnalyzeItemImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      // Überprüfe, ob Loading State angezeigt wird
      await waitFor(() => {
        expect(screen.getByText('Verarbeite Bild...')).toBeInTheDocument();
      });
    });
  });

  describe('Fehlerwiederherstellung', () => {
    test('sollte nach Fehler korrekt wiederherstellen', async () => {
      // Mock für Fehler
      mockAnalyzeItemImage.mockRejectedValue(new Error('Analyse fehlgeschlagen'));

      render(<App />);

      const fileInput = screen.getByLabelText('Bild hochladen');
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });

      await waitFor(() => {
        expect(mockAnalyzeItemImage).toHaveBeenCalled();
      });

      // Überprüfe, ob Fehler angezeigt wird
      expect(screen.getByText('Fehler bei der Analyse')).toBeInTheDocument();

      // Teste Wiederherstellung
      fireEvent.click(screen.getByText('Neustart'));

      // Überprüfe, ob wieder zum Startzustand zurückgekehrt wird
      expect(screen.getByText('Foto Scanner')).toBeInTheDocument();
    });
  });
});