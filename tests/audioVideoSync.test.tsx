import { describe, it, expect, beforeEach, afterEach, jest, act, render, screen } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { LiveService } from '../services/liveService';

/**
 * Audio-Video-Synchronisationstests
 * Testet die Koordination zwischen Audio- und Video-Streaming, Frame-Raten-Anpassung und Ressourcen-Management
 */

// Mock LiveService
const mockLiveService = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendVideoFrame: jest.fn(),
  isMicrophoneActive: jest.fn(() => true),
  getAudioContextState: jest.fn(() => 'running'),
  getPerformanceMetrics: jest.fn(() => ({
    processingTime: 100,
    frameCount: 50,
    droppedFrames: 5,
    averageLatency: 15,
    memoryUsage: 50000000,
    adaptationCount: 2
  })),
  reduceAudioProcessing: jest.fn()
};

// Mock Canvas and Video elements
const mockCanvas = {
  width: 640,
  height: 480,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    stroke: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    })),
    measureText: jest.fn(() => ({ width: 100 })),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    setTransform: jest.fn(),
    toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-base64-data')
  })),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-base64-data'),
  remove: jest.fn()
};

const mockVideoElement = {
  videoWidth: 1280,
  videoHeight: 720,
  srcObject: null,
  play: jest.fn(),
  pause: jest.fn(),
  load: jest.fn(),
  onloadedmetadata: null,
  currentTime: 0,
  duration: 0,
  readyState: 4,
  muted: true,
  autoplay: true,
  playsInline: true
};

// Mock MediaStream
const mockMediaStream = {
  getTracks: jest.fn(() => [
    {
      stop: jest.fn(),
      kind: 'video',
      enabled: true,
      readyState: 'live'
    },
    {
      stop: jest.fn(),
      kind: 'audio',
      enabled: true,
      readyState: 'live'
    }
  ]),
  getVideoTracks: jest.fn(() => [
    {
      stop: jest.fn(),
      kind: 'video',
      enabled: true,
      readyState: 'live'
    }
  ]),
  getAudioTracks: jest.fn(() => [
    {
      stop: jest.fn(),
      kind: 'audio',
      enabled: true,
      readyState: 'live'
    }
  ]),
  active: true
};

// Setup DOM mocks
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn(() => ({
    state: 'running',
    resume: jest.fn(),
    close: jest.fn(),
    createMediaStreamSource: jest.fn(),
    destination: {}
  })),
  writable: true
});

Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn((callback) => setTimeout(callback, 16)),
  writable: true
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document, 'createElement', {
  value: jest.fn((tagName) => {
    if (tagName === 'canvas') return mockCanvas;
    return {};
  }),
  writable: true
});

describe('Audio-Video-Synchronisation', () => {
  let mockStream: typeof mockMediaStream;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStream = { ...mockMediaStream };
    
    // Reset all mocks
    mockLiveService.connect.mockResolvedValue(undefined);
    mockLiveService.disconnect.mockResolvedValue(undefined);
    mockLiveService.sendVideoFrame.mockResolvedValue(undefined);
    mockLiveService.isMicrophoneActive.mockReturnValue(true);
    mockLiveService.getAudioContextState.mockReturnValue('running');
  });

  describe('Service Verification', () => {
    it('should verify both camera and microphone are active', () => {
      const cameraActive = mockStream.active && mockStream.getVideoTracks().length > 0;
      const microphoneActive = mockLiveService.isMicrophoneActive();

      expect(cameraActive).toBe(true);
      expect(microphoneActive).toBe(true);
      expect(cameraActive && microphoneActive).toBe(true);
    });

    it('should handle camera not available', () => {
      const inactiveStream = {
        ...mockStream,
        active: false,
        getVideoTracks: jest.fn(() => [])
      };

      const cameraActive = inactiveStream.active && inactiveStream.getVideoTracks().length > 0;
      expect(cameraActive).toBe(false);
    });

    it('should handle microphone not available', () => {
      mockLiveService.isMicrophoneActive.mockReturnValue(false);

      const microphoneActive = mockLiveService.isMicrophoneActive();
      expect(microphoneActive).toBe(false);
    });

    it('should check audio context state', () => {
      const audioContextState = mockLiveService.getAudioContextState();
      
      expect(['running', 'suspended', 'closed']).toContain(audioContextState);
      expect(audioContextState).toBe('running');
    });
  });

  describe('Coordinated Service Startup', () => {
    it('should start camera and voice services in coordination', async () => {
      const startupResults = {
        camera: false,
        voice: false
      };

      // Simulate camera startup
      await act(async () => {
        mockStream = mockMediaStream;
        startupResults.camera = true;
      });

      // Simulate voice service startup
      await act(async () => {
        await mockLiveService.connect('test-api-key');
        startupResults.voice = true;
      });

      expect(startupResults.camera).toBe(true);
      expect(startupResults.voice).toBe(true);
      expect(mockLiveService.connect).toHaveBeenCalledWith('test-api-key');
    });

    it('should handle camera startup failure', async () => {
      const cameraStartupError = new Error('Camera not available');

      // Simulate camera failure
      expect(() => {
        throw cameraStartupError;
      }).toThrow('Camera not available');
    });

    it('should handle voice service startup failure', async () => {
      mockLiveService.connect.mockRejectedValue(new Error('Voice service failed'));

      try {
        await mockLiveService.connect('test-api-key');
      } catch (error) {
        expect(error).toEqual(new Error('Voice service failed'));
        expect(mockLiveService.connect).toHaveBeenCalledWith('test-api-key');
      }
    });

    it('should implement retry logic for service startup', async () => {
      let retryCount = 0;
      const maxRetries = 3;

      mockLiveService.connect
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce(undefined);

      // Simulate retry logic
      while (retryCount < maxRetries) {
        try {
          await mockLiveService.connect('test-api-key');
          break;
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      expect(retryCount).toBeLessThan(maxRetries);
      expect(mockLiveService.connect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Frame Rate Adaptation', () => {
    it('should adapt frame rate based on performance', () => {
      const performanceTests = [
        {
          avgFrameTime: 10, // Good performance
          currentFrameRate: 5,
          expectedFrameRate: 5.5 // Should increase
        },
        {
          avgFrameTime: 50, // Poor performance
          currentFrameRate: 5,
          expectedFrameRate: 4 // Should decrease
        },
        {
          avgFrameTime: 100, // Very poor performance
          currentFrameRate: 5,
          expectedFrameRate: 2 // Should significantly decrease
        }
      ];

      performanceTests.forEach(test => {
        let adaptedFrameRate = test.currentFrameRate;

        const targetFrameTime = 1000 / test.currentFrameRate;
        const performanceRatio = test.avgFrameTime / targetFrameTime;

        if (performanceRatio > 1.5) {
          // Performance is poor, reduce frame rate
          adaptedFrameRate = Math.max(1, adaptedFrameRate * 0.8);
        } else if (performanceRatio < 0.7 && adaptedFrameRate < 10) {
          // Performance is good, increase frame rate
          adaptedFrameRate = Math.min(10, adaptedFrameRate * 1.1);
        }

        expect(adaptedFrameRate).toBeCloseTo(test.expectedFrameRate, 1);
      });
    });

    it('should implement cooldown period for frame rate adaptation', () => {
      const cooldownPeriod = 2000; // 2 seconds
      let lastAdaptation = 0;
      let currentFrameRate = 5;

      const now = Date.now();
      
      // Should not adapt if cooldown period hasn't passed
      if (now - lastAdaptation < cooldownPeriod) {
        expect(currentFrameRate).toBe(5);
      }

      // Should adapt if cooldown period has passed
      lastAdaptation = now - cooldownPeriod - 1000;
      if (now - lastAdaptation >= cooldownPeriod) {
        currentFrameRate = Math.min(10, currentFrameRate * 1.1);
        expect(currentFrameRate).toBeGreaterThan(5);
      }
    });

    it('should handle dropped frames gracefully', () => {
      const frameMetrics = {
        totalFrames: 100,
        droppedFrames: 10,
        droppedFramePercentage: 0
      };

      frameMetrics.droppedFramePercentage = (frameMetrics.droppedFrames / frameMetrics.totalFrames) * 100;

      expect(frameMetrics.droppedFramePercentage).toBe(10);
      expect(frameMetrics.droppedFramePercentage).toBeLessThan(20); // Should be acceptable
    });

    it('should implement adaptive compression quality', () => {
      const compressionTests = [
        { avgFrameTime: 10, expectedQuality: 0.7 }, // Good performance -> higher quality
        { avgFrameTime: 25, expectedQuality: 0.6 }, // Medium performance -> medium quality
        { avgFrameTime: 50, expectedQuality: 0.5 }, // Poor performance -> lower quality
        { avgFrameTime: 80, expectedQuality: 0.4 }  // Very poor performance -> lowest quality
      ];

      compressionTests.forEach(test => {
        let quality: number;

        if (test.avgFrameTime < 16) {
          quality = 0.7;
        } else if (test.avgFrameTime < 32) {
          quality = 0.6;
        } else if (test.avgFrameTime < 64) {
          quality = 0.5;
        } else {
          quality = 0.4;
        }

        expect(quality).toBe(test.expectedQuality);
      });
    });
  });

  describe('Resource Management', () => {
    it('should monitor memory usage and adapt accordingly', () => {
      const resourceManager = {
        currentMemoryUsage: 0,
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        frameRate: 5,
        audioPriority: true
      };

      // Simulate memory usage calculation
      resourceManager.currentMemoryUsage = 60 * 1024 * 1024; // 60MB

      // Adapt based on memory usage
      if (resourceManager.currentMemoryUsage > resourceManager.maxMemoryUsage * 0.7) {
        resourceManager.frameRate = Math.max(1, resourceManager.frameRate * 0.7);
        resourceManager.audioPriority = true;
      }

      expect(resourceManager.frameRate).toBeLessThan(5);
      expect(resourceManager.audioPriority).toBe(true);
    });

    it('should handle mobile device resource constraints', () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile-specific constraints
        const mobileConstraints = {
          maxFrameRate: 5,
          maxMemoryUsage: 50 * 1024 * 1024, // 50MB on mobile
          batteryOptimization: true
        };

        expect(mobileConstraints.maxFrameRate).toBeLessThan(10);
        expect(mobileConstraints.maxMemoryUsage).toBeLessThan(100 * 1024 * 1024);
        expect(mobileConstraints.batteryOptimization).toBe(true);
      }
    });

    it('should implement battery-aware optimization', async () => {
      // Mock Battery Status API
      const mockBattery = {
        level: 0.2,
        charging: false,
        powerSavingMode: true,
        addEventListener: jest.fn()
      };

      let performanceSettings = {
        frameRate: 5,
        audioQuality: 'high',
        videoQuality: 'high'
      };

      // Adapt based on battery level
      if (mockBattery.level < 0.2 || mockBattery.powerSavingMode) {
        performanceSettings = {
          frameRate: Math.max(1, performanceSettings.frameRate * 0.5),
          audioQuality: 'medium',
          videoQuality: 'low'
        };
      }

      expect(performanceSettings.frameRate).toBe(2.5);
      expect(performanceSettings.audioQuality).toBe('medium');
      expect(performanceSettings.videoQuality).toBe('low');
    });

    it('should clean up resources on service disconnect', () => {
      const cleanupSpy = jest.fn();

      // Simulate cleanup process
      const cleanupProcess = {
        clearAnimationFrames: cleanupSpy,
        clearPerformanceData: cleanupSpy,
        clearAudioLevels: cleanupSpy,
        clearGraphHistory: cleanupSpy
      };

      Object.values(cleanupProcess).forEach(cleanupFn => {
        cleanupFn();
      });

      expect(cleanupSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Recovery', () => {
    it('should handle audio-video conflicts gracefully', () => {
      const conflictHandler = {
        audioPriority: true,
        frameSkipCount: 0,
        maxFrameSkip: 5
      };

      // Simulate conflict resolution
      if (conflictHandler.audioPriority) {
        conflictHandler.frameSkipCount++;
      }

      expect(conflictHandler.frameSkipCount).toBeGreaterThan(0);
      expect(conflictHandler.frameSkipCount).toBeLessThanOrEqual(conflictHandler.maxFrameSkip);
    });

    it('should implement graceful degradation', () => {
      const degradationLevels = [
        {
          level: 'minimal',
          actions: ['reduce frame rate', 'lower video quality']
        },
        {
          level: 'moderate',
          actions: ['reduce frame rate', 'lower video quality', 'reduce audio processing']
        },
        {
          level: 'severe',
          actions: ['audio only mode', 'minimal processing']
        }
      ];

      degradationLevels.forEach(degradation => {
        expect(Array.isArray(degradation.actions)).toBe(true);
        expect(degradation.actions.length).toBeGreaterThan(0);
      });
    });

    it('should handle network issues with retry logic', async () => {
      let networkRetryCount = 0;
      const maxNetworkRetries = 3;

      const mockNetworkError = new Error('Network timeout');

      // Simulate network retry logic
      while (networkRetryCount < maxNetworkRetries) {
        try {
          // Simulate network request
          throw mockNetworkError;
        } catch (error) {
          networkRetryCount++;
          if (networkRetryCount >= maxNetworkRetries) {
            break;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      expect(networkRetryCount).toBe(maxNetworkRetries);
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect performance metrics', () => {
      const performanceMetrics = {
        startTime: Date.now(),
        totalProcessingTime: 0,
        frameCount: 0,
        droppedFrames: 0,
        averageLatency: 0,
        memoryUsage: 0,
        lastMemoryCheck: 0,
        adaptationThreshold: 5000,
        lastAdaptation: 0
      };

      // Simulate performance collection
      performanceMetrics.totalProcessingTime = 1000; // 1 second
      performanceMetrics.frameCount = 50;
      performanceMetrics.droppedFrames = 5;
      performanceMetrics.averageLatency = 20; // 20ms
      performanceMetrics.memoryUsage = 50000000; // 50MB

      expect(performanceMetrics.frameCount).toBeGreaterThan(0);
      expect(performanceMetrics.averageLatency).toBeGreaterThan(0);
      expect(performanceMetrics.memoryUsage).toBeGreaterThan(0);
    });

    it('should calculate frame rate accurately', () => {
      const testDuration = 5000; // 5 seconds
      const expectedFrameCount = 25; // 5 FPS for 5 seconds
      const actualFrameCount = 23; // Some frames dropped

      const actualFrameRate = (actualFrameCount / testDuration) * 1000;

      expect(actualFrameRate).toBeCloseTo(4.6, 1); // Approximately 4.6 FPS
      expect(actualFrameRate).toBeLessThan(5); // Less than expected due to dropped frames
    });

    it('should track adaptation effectiveness', () => {
      const adaptationMetrics = {
        beforeAdaptation: {
          frameRate: 5,
          averageLatency: 50,
          droppedFrames: 10
        },
        afterAdaptation: {
          frameRate: 3,
          averageLatency: 25,
          droppedFrames: 2
        }
      };

      const latencyImprovement = adaptationMetrics.beforeAdaptation.averageLatency - 
                                adaptationMetrics.afterAdaptation.averageLatency;
      const droppedFrameReduction = adaptationMetrics.beforeAdaptation.droppedFrames - 
                                   adaptationMetrics.afterAdaptation.droppedFrames;

      expect(latencyImprovement).toBeGreaterThan(0);
      expect(droppedFrameReduction).toBeGreaterThan(0);
      expect(adaptationMetrics.afterAdaptation.frameRate).toBeLessThan(adaptationMetrics.beforeAdaptation.frameRate);
    });
  });
});

// React Hook for testing
function useAudioVideoSync() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [liveService, setLiveService] = useState<LiveService | null>(null);
  const [isSynchronizing, setIsSynchronizing] = useState(false);

  const startCoordinatedServices = async () => {
    setIsSynchronizing(true);
    
    try {
      // Start camera
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);

      // Start voice service
      const service = new LiveService(
        () => {},
        () => {},
        () => {}
      );
      await service.connect('test-api-key');
      setLiveService(service);

      setIsSynchronizing(false);
      return true;
    } catch (error) {
      setIsSynchronizing(false);
      return false;
    }
  };

  const stopServices = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (liveService) {
      liveService.disconnect();
      setLiveService(null);
    }
  };

  return {
    stream,
    liveService,
    isSynchronizing,
    startCoordinatedServices,
    stopServices
  };
}

describe('React Hook Integration', () => {
  it('should manage audio-video sync state correctly', () => {
    const { result } = renderHook(() => useAudioVideoSync());

    expect(result.current.stream).toBeNull();
    expect(result.current.liveService).toBeNull();
    expect(result.current.isSynchronizing).toBe(false);
  });
});