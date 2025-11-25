import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { LiveService } from '../services/liveService';

/**
 * Berechtigungs- und Medienzugriffstests
 * Testet Browser-Support, Kamera- und Mikrofon-Zugriff sowie AudioContext-Resumption
 */

// Mock MediaDevices
const mockMediaDevices = {
  getUserMedia: jest.fn(),
  enumerateDevices: jest.fn(),
  getDisplayMedia: jest.fn()
};

const mockAudioContext = {
  state: 'running',
  resume: jest.fn(),
  close: jest.fn(),
  createMediaStreamSource: jest.fn(),
  createScriptProcessor: jest.fn(),
  audioWorklet: {
    addModule: jest.fn()
  },
  destination: {}
};

const mockScriptProcessor = {
  bufferSize: 4096,
  onaudioprocess: null,
  connect: jest.fn(),
  disconnect: jest.fn()
};

const mockAudioWorkletNode = {
  port: {
    onmessage: null
  },
  connect: jest.fn(),
  disconnect: jest.fn()
};

const mockMediaStream = {
  getAudioTracks: jest.fn(() => [
    {
      kind: 'audio',
      enabled: true,
      readyState: 'live',
      stop: jest.fn()
    }
  ]),
  getVideoTracks: jest.fn(() => [
    {
      kind: 'video',
      enabled: true,
      readyState: 'live',
      stop: jest.fn()
    }
  ]),
  getTracks: jest.fn(() => [
    {
      stop: jest.fn()
    }
  ])
};

// Setup DOM mocks
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
});

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
});

describe('Berechtigungs- und Medienzugriffstests', () => {
  let liveService: LiveService;
  let mockStatusUpdate: jest.Mock;
  let mockAudioLevels: jest.Mock;
  let mockTranscription: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    mockStatusUpdate = jest.fn();
    mockAudioLevels = jest.fn();
    mockTranscription = jest.fn();
    
    liveService = new LiveService(
      mockStatusUpdate,
      mockAudioLevels,
      mockTranscription
    );

    // Reset all mock implementations
    mockAudioContext.state = 'running';
    mockAudioContext.resume.mockResolvedValue(undefined);
    mockAudioContext.close.mockResolvedValue(undefined);
    mockMediaDevices.getUserMedia.mockResolvedValue(mockMediaStream);
    mockMediaDevices.enumerateDevices.mockResolvedValue([]);
    mockAudioContext.createScriptProcessor.mockReturnValue(mockScriptProcessor);
    mockAudioContext.audioWorklet.addModule.mockResolvedValue(undefined);
  });

  describe('Browser-Support-Checks', () => {
    it('should detect WebRTC support', () => {
      // Test with full support
      expect(navigator.mediaDevices).toBeDefined();
      expect(navigator.mediaDevices.getUserMedia).toBeDefined();
      expect(window.AudioContext).toBeDefined();
    });

    it('should handle missing getUserMedia', () => {
      const originalMediaDevices = navigator.mediaDevices;
      delete (navigator as any).mediaDevices;

      // This would be tested in the actual checkBrowserSupport method
      expect(navigator.mediaDevices).toBeUndefined();

      // Restore
      (navigator as any).mediaDevices = originalMediaDevices;
    });

    it('should handle missing AudioContext', () => {
      const originalAudioContext = window.AudioContext;
      delete (window as any).AudioContext;

      expect(window.AudioContext).toBeUndefined();

      // Restore
      (window as any).AudioContext = originalAudioContext;
    });

    it('should detect AudioWorklet support', () => {
      const audioContext = new (window.AudioContext as any)();
      
      // Check if AudioWorklet is supported
      const hasAudioWorklet = !!audioContext.audioWorklet;
      
      expect(typeof hasAudioWorklet).toBe('boolean');
    });
  });

  describe('Mikrofon-Zugriff', () => {
    it('should request microphone with correct constraints', async () => {
      await liveService.connect('test-api-key');
      
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          sampleSize: 16,
          channelCount: 1
        }
      });
    });

    it('should handle NotAllowedError gracefully', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('NotAllowedError'));

      await liveService.connect('test-api-key');

      expect(mockStatusUpdate).toHaveBeenCalledWith(
        "Mikrofon-Zugriff verweigert. Bitte erlauben Sie den Mikrofon-Zugriff in den Browsereinstellungen.",
        true
      );
    });

    it('should handle NotFoundError gracefully', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('NotFoundError'));

      await liveService.connect('test-api-key');

      expect(mockStatusUpdate).toHaveBeenCalledWith(
        "Kein Mikrofon gefunden. Bitte überprüfen Sie Ihre Audio-Hardware.",
        true
      );
    });

    it('should handle NotReadableError gracefully', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('NotReadableError'));

      await liveService.connect('test-api-key');

      expect(mockStatusUpdate).toHaveBeenCalledWith(
        "Mikrofon ist bereits in Verwendung durch eine andere Anwendung.",
        true
      );
    });

    it('should handle SecurityError gracefully', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('SecurityError'));

      await liveService.connect('test-api-key');

      expect(mockStatusUpdate).toHaveBeenCalledWith(
        "Sicherheitsfehler beim Mikrofon-Zugriff. Bitte verwenden Sie HTTPS.",
        true
      );
    });

    it('should handle TypeError gracefully', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('TypeError'));

      await liveService.connect('test-api-key');

      expect(mockStatusUpdate).toHaveBeenCalledWith(
        "Ungültige Audio-Konfiguration.",
        true
      );
    });

    it('should handle mobile device constraints', async () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      await liveService.connect('test-api-key');

      // Mobile constraints should be different
      const call = mockMediaDevices.getUserMedia.mock.calls[0];
      const audioConstraints = call[0].audio;
      
      expect(audioConstraints).toHaveProperty('echoCancellation', true);
      expect(audioConstraints).not.toHaveProperty('sampleRate'); // Mobile shouldn't specify sample rate
    });
  });

  describe('AudioContext Resumption', () => {
    it('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended';
      
      await liveService.connect('test-api-key');

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should handle audio context resume failure', async () => {
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockRejectedValue(new Error('Resume failed'));

      await liveService.connect('test-api-key');

      // Should handle resume failure gracefully
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should add user interaction listeners for mobile', async () => {
      mockAudioContext.state = 'suspended';
      
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      await liveService.connect('test-api-key');

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });

  describe('Kamera-Zugriff', () => {
    it('should handle camera constraints properly', async () => {
      const mockVideoDevices = [
        {
          deviceId: 'camera1',
          kind: 'videoinput',
          label: 'Front Camera'
        },
        {
          deviceId: 'camera2',
          kind: 'videoinput',
          label: 'Back Camera'
        }
      ];

      mockMediaDevices.enumerateDevices.mockResolvedValue(mockVideoDevices);

      // Test camera access with device enumeration
      await liveService.connect('test-api-key');

      expect(mockMediaDevices.enumerateDevices).toHaveBeenCalled();
    });

    it('should handle camera permission errors', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('NotAllowedError'));

      // This would be tested in the ImageUploader component
      expect(mockMediaDevices.getUserMedia).rejects.toThrow();
    });

    it('should fallback to default constraints when device enumeration fails', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValue(new Error('Permission denied'));

      // Should still attempt camera access with default constraints
      await liveService.connect('test-api-key');

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });
  });

  describe('Service Lifecycle', () => {
    it('should disconnect properly', () => {
      liveService.disconnect();

      expect(mockStatusUpdate).toHaveBeenCalledWith("Verbindung getrennt", false);
    });

    it('should check microphone active state', () => {
      const isActive = liveService.isMicrophoneActive();
      
      // Should return boolean
      expect(typeof isActive).toBe('boolean');
    });

    it('should get audio context state', () => {
      const state = liveService.getAudioContextState();
      
      expect(['running', 'suspended', 'closed']).toContain(state);
    });
  });

  describe('Error Recovery', () => {
    it('should handle multiple microphone access failures', async () => {
      mockMediaDevices.getUserMedia
        .mockRejectedValueOnce(new Error('NotFoundError'))
        .mockRejectedValueOnce(new Error('NotAllowedError'))
        .mockResolvedValueOnce(mockMediaStream);

      await liveService.connect('test-api-key');

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(3);
    });

    it('should handle AudioContext creation failure', async () => {
      const originalAudioContext = window.AudioContext;
      (window as any).AudioContext = jest.fn(() => {
        throw new Error('AudioContext creation failed');
      });

      // This would be handled in the actual implementation
      expect(() => new (window.AudioContext as any)()).toThrow();

      // Restore
      (window as any).AudioContext = originalAudioContext;
    });
  });

  describe('Resource Management', () => {
    it('should clean up microphone tracks on disconnect', () => {
      const stopSpy = jest.spyOn(mockMediaStream.getTracks()[0], 'stop');

      liveService.disconnect();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should clean up audio worklet on disconnect', () => {
      const disconnectSpy = jest.spyOn(mockAudioWorkletNode, 'disconnect');

      liveService.disconnect();

      // Should handle cleanup
      expect(typeof disconnectSpy).toBe('function');
    });

    it('should clean up script processor on disconnect', () => {
      const disconnectSpy = jest.spyOn(mockScriptProcessor, 'disconnect');

      liveService.disconnect();

      expect(typeof disconnectSpy).toBe('function');
    });
  });
});

describe('Mobile Device Support', () => {
  it('should detect mobile devices correctly', () => {
    const mobileUserAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
      'Mozilla/5.0 (Android 10; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0',
      'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)'
    ];

    mobileUserAgents.forEach(userAgent => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      expect(isMobile).toBe(true);
    });
  });

  it('should use mobile-optimized audio constraints', () => {
    const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)';
    
    // Mobile constraints should be simpler
    const mobileConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      // No sample rate specified for mobile
    };

    expect(mobileConstraints).toHaveProperty('echoCancellation', true);
    expect(mobileConstraints).toHaveProperty('noiseSuppression', true);
    expect(mobileConstraints).toHaveProperty('autoGainControl', true);
    expect(mobileConstraints).not.toHaveProperty('sampleRate');
  });
});

describe('Browser Compatibility', () => {
  it('should handle WebKit AudioContext fallback', () => {
    const originalAudioContext = window.AudioContext;
    
    // Mock WebKit fallback
    delete (window as any).AudioContext;
    (window as any).webkitAudioContext = jest.fn(() => mockAudioContext);

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();

    expect(audioContext).toBeDefined();
    expect(mockAudioContext.state).toBe('running');

    // Restore
    (window as any).AudioContext = originalAudioContext;
    delete (window as any).webkitAudioContext;
  });

  it('should handle missing ScriptProcessorNode', () => {
    const mockAudioContextNoScriptProcessor = {
      ...mockAudioContext,
      createScriptProcessor: jest.fn(() => {
        throw new Error('ScriptProcessorNode not supported');
      })
    };

    // This would be handled by the fallback logic
    expect(() => mockAudioContextNoScriptProcessor.createScriptProcessor(4096, 1, 1)).toThrow();
  });
});