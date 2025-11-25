import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageUploader from '../components/ImageUploader';

// Mock für die Bildverarbeitung
const mockImageProcessing = {
  processImage: jest.fn(),
  generateAdFromImage: jest.fn()
};

// Mock für Datei-Upload
const mockFile = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

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

// Mock für URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url'),
  writable: true
});

// Mock für URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true
});

describe('ImageUploader', () => {
  let mockOnImageSelected: jest.Mock;
  let mockOnAutoAdCreated: jest.Mock;
  let mockOnStatusUpdate: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock callbacks
    mockOnImageSelected = jest.fn();
    mockOnAutoAdCreated = jest.fn();
    mockOnStatusUpdate = jest.fn();

    // Mock Bildverarbeitung
    mockImageProcessing.processImage.mockResolvedValue({
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
      sources: [
        { uri: 'test-source', title: 'Testquelle' }
      ]
    });

    mockImageProcessing.generateAdFromImage.mockResolvedValue({
      adData: {
        title: 'Automatisches Inserat',
        description: 'Automatisch generierte Beschreibung',
        category: 'Elektronik',
        priceMin: 15,
        priceMax: 45,
        suggestedPrice: 30,
        keywords: ['auto', 'inserat'],
        condition: 'Gut',
        reasoning: 'Automatisch generiert'
      },
      sources: [
        { uri: 'auto-source', title: 'Automatische Quelle' }
      ]
    });
  });

  describe('Rendering', () => {
    test('sollte korrekt mit PHOTO-Modus gerendert werden', () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      expect(screen.getByText('Foto Scanner')).toBeInTheDocument();
      expect(screen.getByText('Foto machen oder hochladen für automatische Inserat-Erstellung')).toBeInTheDocument();
      expect(screen.getByText('Foto aufnehmen')).toBeInTheDocument();
      expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
    });

    test('sollte korrekt mit VOICE-Modus gerendert werden', () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="VOICE"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      expect(screen.getByText('Live Scanner')).toBeInTheDocument();
      expect(screen.getByText('Echtzeit-Analyse & Sprachsteuerung mit Gemini Live')).toBeInTheDocument();
    });

    test('sollte Upload-Bereich anzeigen', () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
      expect(screen.getByText('oder hier ziehen')).toBeInTheDocument();
    });
  });

  describe('Foto-Upload', () => {
    test('sollte Datei-Upload korrekt handhaben', async () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      // Simuliere Datei-Upload
      const fileInput = screen.getByLabelText('Bild hochladen');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      // Warte auf FileReader
      await waitFor(() => {
        expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);
      });

      // Simuliere FileReader-Erfolg
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,dummy' } });

      // Überprüfe, ob Bildverarbeitung aufgerufen wurde
      await waitFor(() => {
        expect(mockImageProcessing.processImage).toHaveBeenCalledWith('data:image/jpeg;base64,dummy');
      });

      // Überprüfe, ob onImageSelected aufgerufen wurde
      expect(mockOnImageSelected).toHaveBeenCalledWith('data:image/jpeg;base64,dummy');
    });

    test('sollte Upload-Fehler handhaben', async () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      // Simuliere FileReader-Fehler
      mockFileReader.onerror({ target: { error: new Error('Upload fehlgeschlagen') } });

      // Überprüfe, ob Fehler angezeigt wird
      await waitFor(() => {
        expect(screen.getByText('Upload fehlgeschlagen')).toBeInTheDocument();
      });
    });
  });

  describe('Kamera-Funktion', () => {
    test('sollte Kamera-Funktion aufrufen', async () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      // Klicke auf Foto aufnehmen
      fireEvent.click(screen.getByText('Foto aufnehmen'));

      // Überprüfe, ob Mikrofonzugriff angefordert wird
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ 
        audio: false,
        video: true 
      });
    });

    test('sollte Kamera-Zugriff verweigerung handhaben', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue({
        name: 'NotAllowedError',
        message: 'Kamera-Zugriff verweigert'
      });

      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      fireEvent.click(screen.getByText('Foto aufnehmen'));

      // Überprüfe, ob Fehler angezeigt wird
      await waitFor(() => {
        expect(screen.getByText('Kamera-Zugriff verweigert')).toBeInTheDocument();
      });
    });
  });

  describe('Drag & Drop', () => {
    test('sollte Drag & Drop korrekt handhaben', async () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      // Simuliere Drag & Drop
      const dropZone = screen.getByText('oder hier ziehen');
      
      fireEvent.dragEnter(dropZone);
      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone, { 
        dataTransfer: { 
          files: [mockFile] 
        } 
      });

      // Überprüfe, ob Datei verarbeitet wird
      await waitFor(() => {
        expect(mockImageProcessing.processImage).toHaveBeenCalledWith('data:image/jpeg;base64,dummy');
      });
    });

    test('sollte ungültige Dateien ablehnen', async () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      const invalidFile = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
      const dropZone = screen.getByText('oder hier ziehen');
      
      fireEvent.drop(dropZone, { 
        dataTransfer: { 
          files: [invalidFile] 
        } 
      });

      // Überprüfe, ob Fehler angezeigt wird
      await waitFor(() => {
        expect(screen.getByText('Nur Bilddateien sind erlaubt')).toBeInTheDocument();
      });
    });
  });

  describe('Automatische Inserat-Erstellung', () => {
    test('sollte automatische Inserat-Erstellung aufrufen', async () => {
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      // Simuliere Bildauswahl
      const fileInput = screen.getByLabelText('Bild hochladen');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,dummy' } });

      // Warte auf Bildverarbeitung
      await waitFor(() => {
        expect(mockImageProcessing.processImage).toHaveBeenCalled();
      });

      // Simuliere automatische Inserat-Erstellung
      fireEvent.click(screen.getByText('Automatisches Inserat erstellen'));

      // Überprüfe, ob generateAdFromImage aufgerufen wurde
      await waitFor(() => {
        expect(mockImageProcessing.generateAdFromImage).toHaveBeenCalledWith('data:image/jpeg;base64,dummy');
      });

      // Überprüfe, ob onAutoAdCreated aufgerufen wurde
      expect(mockOnAutoAdCreated).toHaveBeenCalledWith({
        adData: expect.any(Object),
        sources: expect.any(Array)
      });
    });
  });

  describe('Zustandsverwaltung', () => {
    test('sollte Ladezustand korrekt anzeigen', async () => {
      // Mock für langsame Bildverarbeitung
      mockImageProcessing.processImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      const fileInput = screen.getByLabelText('Bild hochladen');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,dummy' } });

      // Überprüfe, ob Ladezustand angezeigt wird
      await waitFor(() => {
        expect(screen.getByText('Verarbeite Bild...')).toBeInTheDocument();
      });
    });

    test('sollte Fehlerzustand korrekt anzeigen', async () => {
      mockImageProcessing.processImage.mockRejectedValue(new Error('Bildverarbeitung fehlgeschlagen'));

      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      const fileInput = screen.getByLabelText('Bild hochladen');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,dummy' } });

      // Überprüfe, ob Fehler angezeigt wird
      await waitFor(() => {
        expect(screen.getByText('Bildverarbeitung fehlgeschlagen')).toBeInTheDocument();
      });
    });
  });

  describe('Validierung', () => {
    test('sollte Dateigröße validieren', () => {
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      const fileInput = screen.getByLabelText('Bild hochladen');
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      // Überprüfe, ob Fehler angezeigt wird
      expect(screen.getByText('Datei ist zu groß (max. 5MB)')).toBeInTheDocument();
    });

    test('sollte Dateityp validieren', () => {
      const invalidFile = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
      
      render(
        <ImageUploader
          onImageSelected={mockOnImageSelected}
          initialMode="PHOTO"
          onAutoAdCreated={mockOnAutoAdCreated}
        />
      );

      const fileInput = screen.getByLabelText('Bild hochladen');
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // Überprüfe, ob Fehler angezeigt wird
      expect(screen.getByText('Nur Bilddateien sind erlaubt')).toBeInTheDocument();
    });
  });
});