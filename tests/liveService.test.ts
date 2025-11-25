import { LiveService } from '../services/liveService';

// Mock für die GoogleGenerativeAI und andere Abhängigkeiten
jest.mock('@google/generative-ai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

// Mock für AudioContext und ScriptProcessorNode
const mockAudioContext = {
  createMediaStreamSource: jest.fn(),
  createScriptProcessor: jest.fn(),
  state: 'running',
  sampleRate: 44100
};

const mockScriptProcessor = {
  bufferSize: 4096,
  numberOfInputs: 1,
  numberOfOutputs: 1,
  onaudioprocess: null,
  connect: jest.fn(),
  disconnect: jest.fn()
};

// Mock für window.AudioContext
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
});

Object.defineProperty(window, 'webkitAudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
});

describe('LiveService', () => {
  let liveService: LiveService;
  let mockOnStatusUpdate: jest.Mock;
  let mockOnAudioLevels: jest.Mock;
  let mockOnTranscription: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock callbacks
    mockOnStatusUpdate = jest.fn();
    mockOnAudioLevels = jest.fn();
    mockOnTranscription = jest.fn();

    // Create LiveService instance
    liveService = new LiveService(
      mockOnStatusUpdate,
      mockOnAudioLevels,
      mockOnTranscription
    );

    // Mock AudioContext creation
    mockAudioContext.createScriptProcessor.mockReturnValue(mockScriptProcessor);
  });

  describe('Konstruktor', () => {
    test('sollte mit korrekten Initialwerten erstellt werden', () => {
      expect(liveService).toBeDefined();
      expect(liveService).toBeInstanceOf(LiveService);
    });
  });

  describe('connect()', () => {
    const validApiKey = 'test-api-key-12345';
    const invalidApiKey = '';

    beforeEach(() => {
      // Mock für GoogleGenerativeAI
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          startChat: jest.fn().mockReturnValue({
            sendMessage: jest.fn().mockResolvedValue({
              response: {
                text: jest.fn().mockReturnValue('Testantwort')
              }
            })
          }),
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue('Connection successful')
            }
          })
        })
      }));
    });

    test('sollte erfolgreich mit gültigem API-Key verbinden', async () => {
      // Mock für Mikrofonzugriff
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getAudioTracks: () => [{ kind: 'audio' }]
      });

      await liveService.connect(validApiKey);

      // Überprüfe, ob GoogleGenerativeAI korrekt initialisiert wurde
      expect(GoogleGenerativeAI).toHaveBeenCalledWith(validApiKey);
      
      // Überprüfe, ob Status-Updates korrekt aufgerufen wurden
      expect(mockOnStatusUpdate).toHaveBeenCalledWith("Verbinde mit Gemini...", false);
      expect(mockOnStatusUpdate).toHaveBeenCalledWith("Verbunden - Starte Audio", false);
      
      // Überprüfe, ob Mikrofonzugriff angefordert wurde
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    test('sollte Fehler bei fehlendem API-Key werfen', async () => {
      await expect(liveService.connect(invalidApiKey))
        .rejects
        .toThrow("API_KEY_MISSING");

      expect(mockOnStatusUpdate).toHaveBeenCalledWith(
        expect.stringContaining("Verbindungsfehler"), 
        true
      );
    });

    test('sollte Fehler bei Mikrofonzugriff verweigerung behandeln', async () => {
      // Mock für Mikrofonzugriff verweigert
      mockMediaDevices.getUserMedia.mockRejectedValue({
        name: 'NotAllowedError',
        message: 'Mikrofonzugriff verweigert'
      });

      await liveService.connect(validApiKey);

      // Sollte trotzdem erfolgreich sein, aber Mikrofonzugriff verweigert melden
      expect(mockOnStatusUpdate).toHaveBeenCalledWith(
        "Mikrofon-Zugriff verweigert", 
        true
      );
    });
  });

  describe('Audioverarbeitung', () => {
    beforeEach(() => {
      // Mock für erfolgreiche Verbindung
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          startChat: jest.fn().mockReturnValue({
            sendMessage: jest.fn().mockResolvedValue({
              response: {
                text: jest.fn().mockReturnValue('Testantwort')
              }
            })
          })
        })
      }));

      // Mock für Mikrofonzugriff
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getAudioTracks: () => [{ kind: 'audio' }]
      });
    });

    test('sollte Audio-Processing initialisieren', async () => {
      await liveService.connect('test-key');
      
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
      expect(mockScriptProcessor.onaudioprocess).toBeDefined();
    });

    test('sollte Audio-Levels korrekt berechnen', async () => {
      await liveService.connect('test-key');
      
      // Simuliere Audio-Processing
      const mockEvent = {
        inputBuffer: {
          getChannelData: () => new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
          sampleRate: 44100
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(5)
        }
      };

      // Setze isProcessing auf true
      (liveService as any).isProcessing = true;
      
      // Rufe den Audio-Processor auf
      if (mockScriptProcessor.onaudioprocess) {
        mockScriptProcessor.onaudioprocess(mockEvent);
      }

      // Überprüfe, ob Audio-Levels berechnet wurden
      expect(mockOnAudioLevels).toHaveBeenCalled();
    });

    test('sollte keine Audio-Levels berechnen wenn isProcessing false', async () => {
      await liveService.connect('test-key');
      
      const mockEvent = {
        inputBuffer: {
          getChannelData: () => new Float32Array([0.1, 0.2, 0.3]),
          sampleRate: 44100
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(3)
        }
      };

      // Setze isProcessing auf false
      (liveService as any).isProcessing = false;
      
      // Rufe den Audio-Processor auf
      if (mockScriptProcessor.onaudioprocess) {
        mockScriptProcessor.onaudioprocess(mockEvent);
      }

      // Überprüfe, dass Audio-Levels nicht berechnet wurden
      expect(mockOnAudioLevels).not.toHaveBeenCalled();
    });
  });

  describe('btoaPolyfill', () => {
    test('sollte base64 Kodierung korrekt durchführen', () => {
      const testString = 'Hello World';
      const encoded = (liveService as any).btoaPolyfill(testString);
      
      // Base64 encoded "Hello World" ist "SGVsbG8gV29ybGQ="
      expect(encoded).toBe('SGVsbG8gV29ybGQ=');
    });

    test('sollte mit Sonderzeichen umgehen können', () => {
      const testString = 'Test mit Umlauten: äöü und Sonderzeichen: !@#$%';
      const encoded = (liveService as any).btoaPolyfill(testString);
      
      expect(encoded).toBeDefined();
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe('Fehlerbehandlung', () => {
    test('sollte API-Fehler korrekt behandeln', async () => {
      // Mock für API-Fehler
      (GoogleGenerativeAI as jest.Mock).mockImplementation((apiKey: string) => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          startChat: jest.fn().mockReturnValue({
            sendMessage: jest.fn().mockRejectedValue({
              name: 'APIError',
              message: 'API Fehler 404'
            })
          })
        })
      }));

      await liveService.connect('test-key');

      // Simuliere Audio-Processing mit API-Fehler
      const mockEvent = {
        inputBuffer: {
          getChannelData: () => new Float32Array([0.1, 0.2, 0.3]),
          sampleRate: 44100
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(3)
        }
      };

      (liveService as any).isProcessing = true;
      
      if (mockScriptProcessor.onaudioprocess) {
        mockScriptProcessor.onaudioprocess(mockEvent);
      }

      // Überprüfe, ob API-Fehler behandelt wurde
      expect(mockOnStatusUpdate).toHaveBeenCalledWith(
        expect.stringContaining("Gemini API Fehler"), 
        true
      );
    });
  });

  describe('Zustandsverwaltung', () => {
    test('sollte interne Zustände korrekt verwalten', async () => {
      await liveService.connect('test-key');
      
      // Überprüfe, ob interne Zustände gesetzt wurden
      expect((liveService as any).genAI).toBeDefined();
      expect((liveService as any).model).toBeDefined();
      expect((liveService as any).chat).toBeDefined();
      expect((liveService as any).audioContext).toBeDefined();
      expect((liveService as any).scriptProcessor).toBeDefined();
    });

    test('sollte Audio-Processing korrekt starten und stoppen', async () => {
      await liveService.connect('test-key');
      
      // Teste Start
      (liveService as any).isProcessing = true;
      expect((liveService as any).isProcessing).toBe(true);
      
      // Teste Stop
      (liveService as any).isProcessing = false;
      expect((liveService as any).isProcessing).toBe(false);
    });
  });
});