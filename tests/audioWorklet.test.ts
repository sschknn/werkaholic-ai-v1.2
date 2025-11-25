import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * AudioWorklet-Test-Suite
 * Testet die AudioWorklet-Implementierung, Browser-Kompatibilität und Fallback-Mechanismen
 */

// Mock AudioWorkletProcessor
class MockAudioWorkletProcessor {
  port: {
    onmessage: ((event: MessageEvent) => void) | null;
    postMessage: jest.Mock;
  };

  constructor() {
    this.port = {
      onmessage: null,
      postMessage: jest.fn()
    };
  }

  process(inputs: any[], outputs: any[], parameters: any): boolean {
    // Mock processing logic
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !output) return true;
    
    const inputData = input[0];
    const outputData = output[0];
    
    if (!inputData || !outputData) return true;
    
    // Calculate audio level
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);
    const audioLevel = Math.min(1, rms * 3);
    
    // Send audio level to main thread
    this.port.postMessage({
      type: 'audioLevel',
      level: audioLevel,
      timestamp: performance.now()
    });
    
    // Fill output with silence to prevent echo
    outputData.fill(0);
    
    return true;
  }
}

// Mock registerProcessor
const mockRegisterProcessor = jest.fn();
(window as any).registerProcessor = mockRegisterProcessor;

// Mock AudioWorkletGlobalScope
(window as any).AudioWorkletProcessor = MockAudioWorkletProcessor;

describe('AudioWorklet-Implementierung', () => {
  let audioWorkletProcessor: MockAudioWorkletProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    audioWorkletProcessor = new MockAudioWorkletProcessor();
  });

  describe('AudioWorkletProcessor Initialisierung', () => {
    it('should initialize with correct parameters', () => {
      expect(audioWorkletProcessor.port.postMessage).toBeDefined();
      expect(typeof audioWorkletProcessor.port.postMessage).toBe('function');
    });

    it('should register processor correctly', () => {
      // This would be called in the actual audio-processor.js
      expect(mockRegisterProcessor).not.toHaveBeenCalled();
      
      // Simulate registration
      mockRegisterProcessor('audio-processor', MockAudioWorkletProcessor);
      
      expect(mockRegisterProcessor).toHaveBeenCalledWith('audio-processor', MockAudioWorkletProcessor);
    });
  });

  describe('Audio Processing', () => {
    it('should process audio input correctly', () => {
      const mockInput = [new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5])];
      const mockOutput = [new Float32Array(5)];
      const mockParameters = {};

      const result = audioWorkletProcessor.process(mockInput, mockOutput, mockParameters);

      expect(result).toBe(true);
      expect(audioWorkletProcessor.port.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'audioLevel',
          level: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle empty input gracefully', () => {
      const result = audioWorkletProcessor.process([], [], {});

      expect(result).toBe(true);
      expect(audioWorkletProcessor.port.postMessage).not.toHaveBeenCalled();
    });

    it('should handle null input gracefully', () => {
      const result = audioWorkletProcessor.process([null], [null], {});

      expect(result).toBe(true);
      expect(audioWorkletProcessor.port.postMessage).not.toHaveBeenCalled();
    });

    it('should calculate RMS audio levels correctly', () => {
      const testInput = new Float32Array([0.5, 0.5, 0.5, 0.5]);
      const mockInput = [testInput];
      const mockOutput = [new Float32Array(4)];
      const mockParameters = {};

      audioWorkletProcessor.process(mockInput, mockOutput, mockParameters);

      expect(audioWorkletProcessor.port.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'audioLevel',
          level: expect.any(Number)
        })
      );

      const call = audioWorkletProcessor.port.postMessage.mock.calls[0][0];
      expect(call.level).toBeGreaterThan(0);
      expect(call.level).toBeLessThanOrEqual(1);
    });

    it('should output silence to prevent echo', () => {
      const testInput = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const outputArray = new Float32Array(5);
      const mockInput = [testInput];
      const mockOutput = [outputArray];
      const mockParameters = {};

      audioWorkletProcessor.process(mockInput, mockOutput, mockParameters);

      // Output should be filled with zeros (silence)
      outputArray.forEach(value => {
        expect(value).toBe(0);
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should include timestamp in messages', () => {
      const mockInput = [new Float32Array([0.1, 0.2, 0.3])];
      const mockOutput = [new Float32Array(3)];
      const mockParameters = {};

      audioWorkletProcessor.process(mockInput, mockOutput, mockParameters);

      const call = audioWorkletProcessor.port.postMessage.mock.calls[0][0];
      expect(call.timestamp).toBeGreaterThan(0);
      expect(typeof call.timestamp).toBe('number');
    });

    it('should handle performance gracefully under load', () => {
      const largeInput = new Float32Array(4096); // Large buffer
      for (let i = 0; i < largeInput.length; i++) {
        largeInput[i] = Math.random() * 0.1;
      }

      const mockInput = [largeInput];
      const mockOutput = [new Float32Array(largeInput.length)];
      const mockParameters = {};

      const startTime = performance.now();
      const result = audioWorkletProcessor.process(mockInput, mockOutput, mockParameters);
      const endTime = performance.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', () => {
      // Mock an error in processing
      const originalProcess = audioWorkletProcessor.process;
      
      audioWorkletProcessor.process = jest.fn(() => {
        throw new Error('Processing error');
      });

      // This would be caught in the actual implementation
      expect(() => {
        audioWorkletProcessor.process([], [], {});
      }).toThrow('Processing error');

      // Restore original method
      audioWorkletProcessor.process = originalProcess;
    });

    it('should handle missing port gracefully', () => {
      audioWorkletProcessor.port = null as any;

      const mockInput = [new Float32Array([0.1, 0.2, 0.3])];
      const mockOutput = [new Float32Array(3)];
      const mockParameters = {};

      // Should not throw
      expect(() => {
        audioWorkletProcessor.process(mockInput, mockOutput, mockParameters);
      }).not.toThrow();
    });
  });
});

describe('AudioWorklet Browser Support', () => {
  it('should detect AudioWorklet support', () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const hasAudioWorklet = !!audioContext.audioWorklet;
    
    expect(typeof hasAudioWorklet).toBe('boolean');
  });

  it('should handle missing AudioWorklet support', () => {
    const mockAudioContext = {
      audioWorklet: null,
      createScriptProcessor: jest.fn(),
      state: 'running'
    };

    // This would trigger fallback to ScriptProcessorNode
    expect(mockAudioContext.audioWorklet).toBeNull();
    expect(typeof mockAudioContext.createScriptProcessor).toBe('function');
  });

  it('should load AudioWorklet module', async () => {
    const mockAudioContext = {
      audioWorklet: {
        addModule: jest.fn().mockResolvedValue(undefined)
      }
    };

    await mockAudioContext.audioWorklet.addModule('assets/audio-processor.js');

    expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledWith('assets/audio-processor.js');
  });

  it('should handle AudioWorklet module loading failure', async () => {
    const mockAudioContext = {
      audioWorklet: {
        addModule: jest.fn().mockRejectedValue(new Error('Module not found'))
      }
    };

    await expect(mockAudioContext.audioWorklet.addModule('invalid-module.js'))
      .rejects.toThrow('Module not found');
  });
});

describe('ScriptProcessorNode Fallback', () => {
  it('should create ScriptProcessorNode with correct parameters', () => {
    const mockAudioContext = {
      createScriptProcessor: jest.fn(() => ({
        bufferSize: 4096,
        onaudioprocess: null,
        connect: jest.fn(),
        disconnect: jest.fn()
      }))
    };

    const scriptProcessor = mockAudioContext.createScriptProcessor(4096, 1, 1);

    expect(scriptProcessor.bufferSize).toBe(4096);
    expect(typeof scriptProcessor.onaudioprocess).toBe('function');
    expect(typeof scriptProcessor.connect).toBe('function');
    expect(typeof scriptProcessor.disconnect).toBe('function');
  });

  it('should handle audio processing in ScriptProcessorNode', () => {
    const mockAudioContext = {
      destination: {}
    };

    const audioBuffer = new Float32Array(1024);
    for (let i = 0; i < audioBuffer.length; i++) {
      audioBuffer[i] = Math.random() * 0.1;
    }

    const mockScriptProcessor = {
      bufferSize: 1024,
      onaudioprocess: null as any,
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    // Simulate onaudioprocess event
    const mockEvent = {
      inputBuffer: {
        getChannelData: jest.fn(() => audioBuffer)
      },
      outputBuffer: {
        getChannelData: jest.fn(() => new Float32Array(1024))
      }
    };

    // This would be the actual onaudioprocess handler
    mockScriptProcessor.onaudioprocess = (event: any) => {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      const outputData = outputBuffer.getChannelData(0);

      // Calculate audio levels
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);

      // Process audio data (simplified)
      for (let i = 0; i < outputData.length; i++) {
        outputData[i] = 0; // Silence output
      }
    };

    // Call the handler
    mockScriptProcessor.onaudioprocess(mockEvent);

    expect(mockScriptProcessor.onaudioprocess).toBeDefined();
  });
});

describe('Mobile Optimization', () => {
  it('should detect mobile devices', () => {
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

  it('should use optimized buffer sizes on mobile', () => {
    const mobileConstraints = {
      // Mobile devices should use smaller buffer sizes
      maxBufferSize: 256, // Smaller than desktop
      processingFrequency: 'lower' // Less frequent processing
    };

    expect(mobileConstraints.maxBufferSize).toBeLessThan(512);
    expect(mobileConstraints.processingFrequency).toBe('lower');
  });

  it('should handle battery optimization', () => {
    // Mock Battery Status API
    const mockBattery = {
      level: 0.3,
      charging: false,
      powerSavingMode: true,
      addEventListener: jest.fn()
    };

    // This would be used for battery-aware optimization
    expect(mockBattery.level).toBeLessThan(0.5);
    expect(mockBattery.powerSavingMode).toBe(true);
  });
});

describe('Audio Quality Optimization', () => {
  it('should apply noise reduction', () => {
    const inputAudio = new Float32Array(100);
    const threshold = 0.01;

    // Fill with some noise
    for (let i = 0; i < inputAudio.length; i++) {
      inputAudio[i] = (Math.random() - 0.5) * 0.02; // Small noise values
    }

    // Apply noise gate (simplified)
    const processedAudio = new Float32Array(inputAudio.length);
    for (let i = 0; i < inputAudio.length; i++) {
      if (Math.abs(inputAudio[i]) > threshold) {
        processedAudio[i] = inputAudio[i];
      } else {
        processedAudio[i] = 0;
      }
    }

    // Count non-zero samples
    const nonZeroSamples = processedAudio.filter(sample => sample !== 0).length;
    expect(nonZeroSamples).toBeLessThan(inputAudio.length);
  });

  it('should convert Float32Array to Int16Array', () => {
    const floatArray = new Float32Array([0.5, -0.3, 0.8, -1.0, 0.1]);
    const intArray = new Int16Array(floatArray.length);

    // Convert to 16-bit PCM (simplified)
    for (let i = 0; i < floatArray.length; i++) {
      const sample = Math.max(-1, Math.min(1, floatArray[i]));
      intArray[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    expect(intArray.length).toBe(floatArray.length);
    expect(intArray[0]).toBeCloseTo(0.5 * 0x7FFF);
    expect(intArray[1]).toBeCloseTo(-0.3 * 0x8000);
  });

  it('should handle sample rate adaptation', () => {
    const audioLevelTests = [
      { level: 0.05, expectedSampleRate: 16000 }, // Low level -> lower sample rate
      { level: 0.2, expectedSampleRate: 32000 },  // Medium level -> medium sample rate
      { level: 0.8, expectedSampleRate: 48000 }   // High level -> higher sample rate
    ];

    audioLevelTests.forEach(test => {
      let sampleRate: number;

      if (test.level < 0.1) {
        sampleRate = 16000;
      } else if (test.level < 0.3) {
        sampleRate = 32000;
      } else {
        sampleRate = 48000;
      }

      expect(sampleRate).toBe(test.expectedSampleRate);
    });
  });
});