import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const STORAGE_KEY_GOOGLE = "GOOGLE_API_KEY";

export const getStoredGoogleKey = (): string | null => {
  const key = localStorage.getItem(STORAGE_KEY_GOOGLE);
  console.log('[DEBUG] liveService.getStoredGoogleKey():', {
    keyFound: !!key,
    keyLength: key?.length,
    storageKey: STORAGE_KEY_GOOGLE,
    timestamp: new Date().toISOString()
  });
  
  if (!key) {
    console.warn('[DEBUG] WARNUNG: Kein Google API Key gefunden im localStorage!');
    console.log('[DEBUG] Verfügbare localStorage Keys:', Object.keys(localStorage));
  }
  
  return key;
};

export const setStoredGoogleKey = (key: string) => {
  localStorage.setItem(STORAGE_KEY_GOOGLE, key);
};

export class LiveService {
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private isConnected = false;
  private sessionPromise: Promise<any> | null = null;
  private stream: MediaStream | null = null;
  private currentTurnText = "";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;
  private isReconnecting = false;

  constructor(
      private onStatusChange: (status: string, isError: boolean) => void,
      private onVolumeChange: (inputVol: number, outputVol: number) => void,
      private onTranscription: (text: string, isFinal: boolean) => void
  ) {}

  async connect(apiKey?: string) {
    if (this.isConnected || this.isReconnecting) return;

    try {
      this.onStatusChange("Initialisiere...", false);
      
      // 1. Get Microphone Permission explicitly first
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error("Microphone permission denied", err);
        throw new Error("Mikrofon-Zugriff verweigert");
      }

      this.onStatusChange("Verbinde...", false);
      
      // Use provided API key or fallback to stored key
      const finalApiKey = apiKey || getStoredGoogleKey();
      if (!finalApiKey) {
        throw new Error("Kein gültiger API-Schlüssel verfügbar");
      }
      
      const ai = new GoogleGenAI({ apiKey: finalApiKey });

      // Init Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Handle Auto-Play Policy (Resume if suspended)
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

      // Connect to Live API
      this.sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this.reconnectAttempts = 0; // Reset on successful connection
            this.isReconnecting = false;
            this.onStatusChange("Bereit", false);
            if (this.stream) {
                this.startAudioInput(this.stream);
            }
          },
          onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
          onclose: () => {
            this.isConnected = false;
            this.onStatusChange("Verbindung verloren", false);
            this.scheduleReconnect();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            this.isConnected = false;
            this.onStatusChange("Verbindungsfehler", true);
            this.scheduleReconnect();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "Du bist ein hilfreicher Assistent für eBay Kleinanzeigen. Du analysierst Gegenstände im Video Feed. Fasse dich kurz. Wenn du einen Gegenstand erkennst, nenne seinen Namen, geschätzten Wert und Zustand. Sprich Deutsch.",
        },
      });

      await this.sessionPromise;

    } catch (e: any) {
      console.error("Connection sequence failed", e);
      let msg = "Fehler";
      
      if (e.message.includes("Mikrofon")) msg = "Mikrofon fehlt";
      else if (e.message.includes("403") || e.message.includes("AUTH")) msg = "Key ungültig";
      
      this.onStatusChange(msg, true);
      this.disconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Exponential backoff, max 10s
    
    this.onStatusChange(`Verbinde neu (Versuch ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, false);
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect().catch(() => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.onStatusChange("Zu viele Verbindungsfehler", true);
          this.isReconnecting = false;
        }
      });
    }, delay);
  }

  public stopReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private startAudioInput(stream: MediaStream) {
    if (!this.inputAudioContext || !this.sessionPromise) return;

    try {
        this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
        this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
          if (!this.isConnected) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate Volume for UI
          if (this.onVolumeChange) {
              const vol = this.calculateRMS(inputData);
              this.onVolumeChange(vol, 0);
          }

          const base64Data = this.pcmFloat32ToBase64(inputData);
          
          this.sessionPromise?.then(session => {
            session.sendRealtimeInput({
              media: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Data
              }
            });
          }).catch(err => {
             console.debug("Send input failed", err);
          });
        };

        const gainNode = this.inputAudioContext.createGain();
        gainNode.gain.value = 0;

        this.inputSource.connect(this.processor);
        this.processor.connect(gainNode);
        gainNode.connect(this.inputAudioContext.destination);

    } catch (e) {
        console.error("Audio Input Setup Failed", e);
        this.onStatusChange("Audio Fehler", true);
    }
  }

  public sendVideoFrame(base64Image: string) {
    if (!this.isConnected || !this.sessionPromise) {
      console.debug("LiveService: Not connected, cannot send video frame");
      return false;
    }
    
    if (!base64Image || base64Image.length < 100) {
      console.debug("LiveService: Invalid image data");
      return false;
    }
    
    this.sessionPromise.then(session => {
      try {
        session.sendRealtimeInput({
            media: {
              mimeType: "image/jpeg",
              data: base64Image
            }
        });
        return true;
      } catch (err) {
        console.error("Failed to send video frame:", err);
        return false;
      }
    }).catch((err) => {
      console.error("Video frame transmission failed:", err);
      return false;
    });
    
    return true;
  }

  private async handleMessage(message: LiveServerMessage) {
    const content = message.serverContent;

    // Handle Audio Output
    const audioData = content?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      try {
          const uint8 = this.base64ToUint8Array(audioData);
          const audioBuffer = await this.decodeAudioData(uint8, this.outputAudioContext);
          
          // Calculate approximate volume for UI
          if (this.onVolumeChange) {
             const channelData = audioBuffer.getChannelData(0);
             const step = Math.floor(channelData.length / 50);
             let sum = 0;
             let count = 0;
             for(let i=0; i<channelData.length; i+=step) {
                 sum += channelData[i] * channelData[i];
                 count++;
             }
             const vol = Math.sqrt(sum / count);
             this.onVolumeChange(0, vol * 2.5);
          }

          this.playAudioBuffer(audioBuffer);
      } catch (e) {
          console.error("Audio decode error", e);
      }
    }

    // Handle Transcription (Text) - Accumulate text chunks
    if (content?.outputTranscription?.text) {
        this.currentTurnText += content.outputTranscription.text;
        this.onTranscription(this.currentTurnText, false);
    }

    // Handle Turn Complete - Send full text
    if (content?.turnComplete) {
        this.onTranscription(this.currentTurnText, true);
        this.currentTurnText = "";
    }

    // Handle Interruption - Clear text
    if (content?.interrupted) {
        this.nextStartTime = 0;
        this.currentTurnText = "";
        this.onTranscription("", false); // Clear UI
    }
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioContext.destination);
    
    const currentTime = this.outputAudioContext.currentTime;
    if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  public disconnect() {
    this.isConnected = false;
    this.currentTurnText = ""; // Reset text on disconnect
    this.stopReconnect(); // Stop any pending reconnect attempts

    if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
    }

    if (this.inputSource) {
        try { this.inputSource.disconnect(); } catch {}
        this.inputSource = null;
    }
    if (this.processor) {
        try { this.processor.disconnect(); } catch {}
        this.processor = null;
    }
    
    if (this.inputAudioContext) {
        try { this.inputAudioContext.close(); } catch {}
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        try { this.outputAudioContext.close(); } catch {}
        this.outputAudioContext = null;
    }
    
    if (this.sessionPromise) {
        this.sessionPromise.then(s => {
            try { s.close(); } catch {}
        }).catch(() => {});
    }

    this.session = null;
    this.sessionPromise = null;
    this.nextStartTime = 0;
  }

  private pcmFloat32ToBase64(data: Float32Array): string {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for(let i=0; i<bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
      const dataInt16 = new Int16Array(data.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      
      for(let i=0; i<dataInt16.length; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
      }
      return buffer;
  }
}