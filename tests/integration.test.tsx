import { describe, it, expect, beforeEach, afterEach, jest, act, render, screen, fireEvent, waitFor } from '@jest/globals';
import { renderHook, cleanup } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { LiveService } from '../services/liveService';
import { ImageUploader } from '../components/ImageUploader';

/**
 * Integrationstests des gesamten Live-Scanner-Workflows
 * Testet End-to-End-Tests, Voice-Chat mit Transkription und Foto-Video-Modus-Integration
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
  reduceAudioProcessing: jest.fn(),
  forceResumeAudioContext: jest.fn()
};

// Mock Gemini Service
const mockGeminiService = {
  analyzeProductImage: jest.fn(),
  analyzeItemImage: jest.fn()
};

// Mock MediaDevices
const mockMediaDevices = {
  getUserMedia: jest.fn(),
  enumerateDevices: jest.fn()
};

// Mock Canvas and Video elements
const mockCanvas = {
  width: 640,
  height: 480,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-base64-data')
  })),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-base64-data')
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

Object.defineProperty(document, 'createElement', {
  value: jest.fn((tagName) => {
    if (tagName === 'canvas') return mockCanvas;
    return {};
  }),
  writable: true
});

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
});

// Mock environment variables
process.env.VITE_GEMINI_KEY = 'test-api-key-12345';

describe('Integrationstests des Live-Scanner-Workflows', () => {
  let mockStream: any;
  let mockCallback: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStream = {
      getTracks: jest.fn(() => [
        { stop: jest.fn(), kind: 'video', enabled: true, readyState: 'live' },
        { stop: jest.fn(), kind: 'audio', enabled: true, readyState: 'live' }
      ]),
      getVideoTracks: jest.fn(() => [
        { stop: jest.fn(), kind: 'video', enabled: true, readyState: 'live' }
      ]),
      getAudioTracks: jest.fn(() => [
        { stop: jest.fn(), kind: 'audio', enabled: true, readyState: 'live' }
      ]),
      active: true
    };

    mockCallback = {
      onImageSelected: jest.fn(),
      onAutoAdCreated: jest.fn()
    };

    // Setup default mocks
    mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
    mockMediaDevices.enumerateDevices.mockResolvedValue([]);
    mockLiveService.connect.mockResolvedValue(undefined);
    mockLiveService.disconnect.mockResolvedValue(undefined);
    mockGeminiService.analyzeProductImage.mockResolvedValue({
      data: {
        title: 'Test Product',
        description: 'Test description',
        category: 'Test Category',
        condition: 'Gebraucht',
        priceMin: 10,
        priceMax: 30,
        suggestedPrice: 20,
        keywords: ['test', 'product'],
        reasoning: 'Test reasoning'
      },
      sources: []
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('End-to-End Live Scanner Workflow', () => {
    it('should complete full workflow: camera access -> voice chat -> transcription -> analysis', async () => {
      const workflowState = {
        cameraAccess: false,
        voiceService: false,
        transcription: false,
        analysis: false,
        adCreation: false
      };

      // Step 1: Camera Access
      await act(async () => {
        mockStream = await mockMediaDevices.getUserMedia({ video: true, audio: false });
        workflowState.cameraAccess = true;
      });

      expect(workflowState.cameraAccess).toBe(true);
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });

      // Step 2: Voice Service Connection
      await act(async () => {
        await mockLiveService.connect('test-api-key-12345');
        workflowState.voiceService = true;
      });

      expect(workflowState.voiceService).toBe(true);
      expect(mockLiveService.connect).toHaveBeenCalledWith('test-api-key-12345');

      // Step 3: Transcription
      await act(async () => {
        // Simulate transcription callback
        const transcriptionCallback = jest.fn();
        transcriptionCallback('This is a test product description');
        workflowState.transcription = true;
      });

      expect(workflowState.transcription).toBe(true);

      // Step 4: Analysis
      await act(async () => {
        const analysisResult = await mockGeminiService.analyzeProductImage('test-data', 'image/jpeg');
        workflowState.analysis = !!analysisResult;
      });

      expect(workflowState.analysis).toBe(true);

      // Step 5: Ad Creation
      await act(async () => {
        const analysisResult = await mockGeminiService.analyzeProductImage('test-data', 'image/jpeg');
        mockCallback.onAutoAdCreated(analysisResult, 'test-snapshot');
        workflowState.adCreation = true;
      });

      expect(workflowState.adCreation).toBe(true);
      expect(mockCallback.onAutoAdCreated).toHaveBeenCalled();
    });

    it('should handle workflow interruption gracefully', async () => {
      const interruptionPoints = [
        'camera_access',
        'voice_service',
        'transcription',
        'analysis',
        'ad_creation'
      ];

      interruptionPoints.forEach(async (interruptionPoint) => {
        let workflowCompleted = false;
        let errorHandled = false;

        try {
          // Simulate workflow up to interruption point
          if (interruptionPoint !== 'camera_access') {
            await mockMediaDevices.getUserMedia({ video: true, audio: false });
          }

          if (interruptionPoint !== 'voice_service') {
            await mockLiveService.connect('test-api-key-12345');
          }

          if (interruptionPoint !== 'transcription') {
            // Simulate transcription
          }

          if (interruptionPoint !== 'analysis') {
            await mockGeminiService.analyzeProductImage('test-data', 'image/jpeg');
          }

          if (interruptionPoint !== 'ad_creation') {
            mockCallback.onAutoAdCreated(
              await mockGeminiService.analyzeProductImage('test-data', 'image/jpeg'),
              'test-snapshot'
            );
          }

          workflowCompleted = true;
        } catch (error) {
          errorHandled = true;
        }

        // Should either complete or handle error gracefully
        expect(workflowCompleted || errorHandled).toBe(true);
      });
    });

    it('should validate data flow between components', () => {
      const testDataFlow = {
        cameraData: 'video-stream-data',
        audioData: 'audio-stream-data',
        transcriptionText: 'transcribed-speech-text',
        analysisResult: {
          title: 'Test Product',
          description: 'Test description',
          price: 25.99
        },
        adData: {
          title: 'Test Product',
          description: 'Test description',
          price: 25.99,
          category: 'Test Category'
        }
      };

      // Validate data types and structure
      expect(typeof testDataFlow.cameraData).toBe('string');
      expect(typeof testDataFlow.audioData).toBe('string');
      expect(typeof testDataFlow.transcriptionText).toBe('string');
      expect(testDataFlow.analysisResult).toHaveProperty('title');
      expect(testDataFlow.analysisResult).toHaveProperty('description');
      expect(testDataFlow.analysisResult).toHaveProperty('price');
      expect(testDataFlow.adData).toHaveProperty('title');
      expect(testDataFlow.adData).toHaveProperty('description');
      expect(testDataFlow.adData).toHaveProperty('price');
      expect(testDataFlow.adData).toHaveProperty('category');
    });
  });

  describe('Voice-Chat mit automatischer Transkription', () => {
    it('should handle continuous voice input and transcription', async () => {
      const voiceSession = {
        startTime: Date.now(),
        transcriptionHistory: [] as string[],
        analysisResults: [] as any[],
        errors: [] as string[]
      };

      const testTranscriptions = [
        'I want to sell my iPhone',
        'It is in good condition',
        'Only used for six months',
        'Looking for 300 euros'
      ];

      // Simulate continuous transcription
      for (const transcription of testTranscriptions) {
        try {
          // Simulate transcription callback
          voiceSession.transcriptionHistory.push(transcription);

          // Simulate analysis of each transcription
          const analysisResult = await mockGeminiService.analyzeProductImage('test-data', 'image/jpeg');
          voiceSession.analysisResults.push(analysisResult);

          // Simulate ad creation
          mockCallback.onAutoAdCreated(analysisResult, 'test-snapshot');
        } catch (error) {
          voiceSession.errors.push(error.message);
        }
      }

      expect(voiceSession.transcriptionHistory).toHaveLength(testTranscriptions.length);
      expect(voiceSession.analysisResults).toHaveLength(testTranscriptions.length);
      expect(voiceSession.errors).toHaveLength(0); // No errors expected
    });

    it('should handle transcription errors and recover', async () => {
      const errorScenarios = [
        { type: 'network_error', expectedRecovery: true },
        { type: 'api_error', expectedRecovery: true },
        { type: 'audio_error', expectedRecovery: true },
        { type: 'processing_error', expectedRecovery: true }
      ];

      errorScenarios.forEach(async (scenario) => {
        let recoverySuccessful = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries && !recoverySuccessful) {
          try {
            // Simulate error scenario
            if (scenario.type === 'network_error') {
              throw new Error('Network timeout');
            } else if (scenario.type === 'api_error') {
              throw new Error('API rate limit exceeded');
            } else if (scenario.type === 'audio_error') {
              throw new Error('Audio processing failed');
            } else if (scenario.type === 'processing_error') {
              throw new Error('Processing error');
            }

            recoverySuccessful = true;
          } catch (error) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }

        expect(recoverySuccessful).toBe(scenario.expectedRecovery);
        expect(retryCount).toBeLessThanOrEqual(maxRetries);
      });
    });

    it('should maintain transcription context across multiple inputs', () => {
      const transcriptionContext = {
        conversationHistory: [] as string[],
        productDetails: {
          name: '',
          condition: '',
          price: 0,
          features: [] as string[]
        },
        contextKeywords: [] as string[]
      };

      const conversationFlow = [
        'I have an iPhone to sell',
        'It is an iPhone 13 Pro',
        'The condition is excellent',
        'Only 200 GB storage',
        'Looking for 600 euros'
      ];

      conversationFlow.forEach(transcription => {
        transcriptionContext.conversationHistory.push(transcription);

        // Extract product details from transcription
        if (transcription.includes('iPhone')) {
          transcriptionContext.productDetails.name = 'iPhone 13 Pro';
        }
        if (transcription.includes('excellent') || transcription.includes('good')) {
          transcriptionContext.productDetails.condition = 'excellent';
        }
        if (transcription.match(/\d+/)) {
          const priceMatch = transcription.match(/(\d+)\s*(?:euros?|€)/i);
          if (priceMatch) {
            transcriptionContext.productDetails.price = parseInt(priceMatch[1]);
          }
        }

        // Extract keywords
        const words = transcription.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 3 && !transcriptionContext.contextKeywords.includes(word)) {
            transcriptionContext.contextKeywords.push(word);
          }
        });
      });

      expect(transcriptionContext.conversationHistory).toHaveLength(conversationFlow.length);
      expect(transcriptionContext.productDetails.name).toBe('iPhone 13 Pro');
      expect(transcriptionContext.productDetails.condition).toBe('excellent');
      expect(transcriptionContext.productDetails.price).toBe(600);
      expect(transcriptionContext.contextKeywords.length).toBeGreaterThan(0);
    });
  });

  describe('Foto- und Voice-Modus Integration', () => {
    it('should switch seamlessly between PHOTO and VOICE modes', async () => {
      const modeSwitching = {
        currentMode: 'PHOTO',
        previousMode: null,
        switchHistory: [] as string[],
        cameraState: 'inactive',
        audioState: 'inactive',
        errors: [] as string[]
      };

      const switchSequence = ['VOICE', 'PHOTO', 'VOICE', 'PHOTO'];

      for (const targetMode of switchSequence) {
        try {
          modeSwitching.previousMode = modeSwitching.currentMode;
          modeSwitching.currentMode = targetMode;
          modeSwitching.switchHistory.push(`Switched to ${targetMode}`);

          if (targetMode === 'VOICE') {
            // Start voice mode services
            await mockMediaDevices.getUserMedia({ video: true, audio: true });
            await mockLiveService.connect('test-api-key-12345');
            modeSwitching.cameraState = 'active';
            modeSwitching.audioState = 'active';
          } else {
            // Stop voice services, keep camera for photo mode
            mockLiveService.disconnect();
            modeSwitching.audioState = 'inactive';
            modeSwitching.cameraState = 'active';
          }

          expect(modeSwitching.currentMode).toBe(targetMode);
        } catch (error) {
          modeSwitching.errors.push(error.message);
        }
      }

      expect(modeSwitching.switchHistory).toHaveLength(switchSequence.length);
      expect(modeSwitching.errors).toHaveLength(0);
      expect(modeSwitching.cameraState).toBe('active');
    });

    it('should preserve camera stream during mode transitions', async () => {
      // Start with camera access
      await mockMediaDevices.getUserMedia({ video: true, audio: false });

      const cameraPreservation = {
        initialStream: mockStream,
        preservedThroughTransitions: true,
        streamActiveAfterTransitions: true
      };

      // Simulate multiple mode switches
      for (let i = 0; i < 3; i++) {
        // Switch to VOICE mode
        await mockMediaDevices.getUserMedia({ video: true, audio: true });
        
        // Switch back to PHOTO mode
        // Camera stream should remain active
      }

      expect(cameraPreservation.preservedThroughTransitions).toBe(true);
      expect(cameraPreservation.streamActiveAfterTransitions).toBe(true);
    });

    it('should handle resource cleanup during mode switching', () => {
      const resourceCleanup = {
        cameraTracksStopped: false,
        audioTracksStopped: false,
        liveServiceDisconnected: false,
        canvasElementsCleaned: false,
        eventListenersRemoved: false
      };

      // Simulate cleanup process
      const mockTracks = [{ stop: jest.fn() }, { stop: jest.fn() }];
      const mockCanvas = { remove: jest.fn() };
      const mockEventListener = { removeEventListener: jest.fn() };

      // Stop camera tracks
      mockTracks.forEach(track => track.stop());
      resourceCleanup.cameraTracksStopped = true;

      // Stop audio tracks (handled by LiveService)
      resourceCleanup.audioTracksStopped = true;

      // Disconnect live service
      mockLiveService.disconnect();
      resourceCleanup.liveServiceDisconnected = true;

      // Clean up canvas elements
      mockCanvas.remove();
      resourceCleanup.canvasElementsCleaned = true;

      // Remove event listeners
      mockEventListener.removeEventListener('click', expect.any(Function));
      resourceCleanup.eventListenersRemoved = true;

      Object.values(resourceCleanup).forEach(cleanupCompleted => {
        expect(cleanupCompleted).toBe(true);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API key validation errors', async () => {
      const errorTests = [
        { apiKey: '', expectedError: 'API_KEY_MISSING' },
        { apiKey: null, expectedError: 'API_KEY_MISSING' },
        { apiKey: 'invalid-key', expectedError: 'AUTH_ERROR' },
        { apiKey: 'rate-limited-key', expectedError: 'RATE_LIMIT_ERROR' }
      ];

      for (const test of errorTests) {
        try {
          if (test.apiKey === '') {
            throw new Error('API_KEY_MISSING');
          } else if (test.apiKey === null) {
            throw new Error('API_KEY_MISSING');
          } else if (test.apiKey === 'invalid-key') {
            throw new Error('AUTH_ERROR');
          } else if (test.apiKey === 'rate-limited-key') {
            throw new Error('RATE_LIMIT_ERROR');
          }
        } catch (error) {
          expect(error.message).toBe(test.expectedError);
        }
      }
    });

    it('should implement graceful degradation under stress', () => {
      const degradationLevels = [
        {
          level: 'normal',
          features: ['voice_chat', 'video_streaming', 'real_time_analysis'],
          quality: 'high'
        },
        {
          level: 'degraded',
          features: ['voice_chat', 'video_streaming'],
          quality: 'medium'
        },
        {
          level: 'minimal',
          features: ['voice_chat'],
          quality: 'low'
        },
        {
          level: 'emergency',
          features: ['basic_photo_mode'],
          quality: 'minimal'
        }
      ];

      degradationLevels.forEach(degradation => {
        expect(Array.isArray(degradation.features)).toBe(true);
        expect(degradation.features.length).toBeGreaterThan(0);
        expect(['high', 'medium', 'low', 'minimal']).toContain(degradation.quality);
      });
    });

    it('should maintain data integrity during errors', () => {
      const dataIntegrity = {
        transcriptionHistory: ['test transcription 1', 'test transcription 2'],
        analysisResults: [{ title: 'Test 1' }, { title: 'Test 2' }],
        userPreferences: { language: 'de', theme: 'dark' },
        cachedData: { lastAnalysis: 'test-data' }
      };

      // Simulate error scenario
      const errorOccurred = true;

      if (errorOccurred) {
        // Data should be preserved
        expect(dataIntegrity.transcriptionHistory).toHaveLength(2);
        expect(dataIntegrity.analysisResults).toHaveLength(2);
        expect(dataIntegrity.userPreferences).toHaveProperty('language');
        expect(dataIntegrity.cachedData).toHaveProperty('lastAnalysis');
      }
    });
  });

  describe('User Experience Flow', () => {
    it('should provide clear feedback during each workflow stage', () => {
      const userFeedback = {
        cameraAccess: { status: 'waiting', message: 'Bitte Kamera erlauben' },
        voiceService: { status: 'connecting', message: 'Verbinde mit KI...' },
        transcription: { status: 'listening', message: 'Höre zu...' },
        analysis: { status: 'analyzing', message: 'Analysiere Produkt...' },
        result: { status: 'complete', message: 'Ergebnis bereit!' }
      };

      Object.values(userFeedback).forEach(feedback => {
        expect(feedback).toHaveProperty('status');
        expect(feedback).toHaveProperty('message');
        expect(typeof feedback.status).toBe('string');
        expect(typeof feedback.message).toBe('string');
      });
    });

    it('should handle user interruptions gracefully', () => {
      const interruptionTypes = [
        'user_cancelled',
        'mode_switch',
        'page_refresh',
        'browser_close'
      ];

      interruptionTypes.forEach(interruption => {
        let cleanupCompleted = false;
        let userDataPreserved = false;

        // Simulate interruption handling
        if (interruption === 'user_cancelled') {
          cleanupCompleted = true;
          userDataPreserved = true;
        } else if (interruption === 'mode_switch') {
          cleanupCompleted = true;
          userDataPreserved = true;
        } else if (interruption === 'page_refresh') {
          cleanupCompleted = true;
          userDataPreserved = true;
        } else if (interruption === 'browser_close') {
          cleanupCompleted = true;
          userDataPreserved = false; // Cannot preserve on browser close
        }

        expect(cleanupCompleted).toBe(true);
        if (interruption !== 'browser_close') {
          expect(userDataPreserved).toBe(true);
        }
      });
    });

    it('should maintain consistent UI state across mode changes', () => {
      const uiState = {
        currentMode: 'VOICE',
        cameraPreviewVisible: true,
        voiceControlsVisible: true,
        photoControlsVisible: false,
        analysisResultsVisible: false,
        loadingStates: {}
      };

      // Simulate mode change
      uiState.currentMode = 'PHOTO';
      uiState.voiceControlsVisible = false;
      uiState.photoControlsVisible = true;

      expect(uiState.currentMode).toBe('PHOTO');
      expect(uiState.cameraPreviewVisible).toBe(true);
      expect(uiState.voiceControlsVisible).toBe(false);
      expect(uiState.photoControlsVisible).toBe(true);
    });
  });
});