
import React, { useRef, useState, useEffect } from 'react';
import { Upload, Camera, Radio, Mic, X, Activity, Play, Plus, Clock, ChevronRight } from 'lucide-react';
import { LiveService, getStoredGoogleKey } from '../services/liveService';
import { analyzeItemImage } from '../services/geminiService';
import { LiveLogItem } from '../types';

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  initialMode?: 'PHOTO' | 'VOICE';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, initialMode = 'PHOTO' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  
  // Modes
  const [mode, setMode] = useState<'PHOTO' | 'VOICE'>(initialMode);
  
  // Gemini Live State
  const liveServiceRef = useRef<LiveService | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("Initialisiere");
  const [liveError, setLiveError] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState<string>("");
  const [liveHistory, setLiveHistory] = useState<LiveLogItem[]>([]);
  
  // Audio Visualizer Refs (avoid state for performance)
  const audioLevelsRef = useRef({ input: 0, output: 0 });
  const animationFrameRef = useRef<number>(0);
  const graphHistoryRef = useRef<number[]>(new Array(50).fill(0));
  
  // Frame Analysis State
  const lastFrameRef = useRef<string>("");
  const frameCounterRef = useRef<number>(0);
  const motionDetectionRef = useRef<number[]>(new Array(10).fill(0));
  const analysisCooldownRef = useRef<number>(0);

  // Update mode if prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Init/Cleanup Camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      stopVoiceService();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Handle Mode Switching
  useEffect(() => {
    if (mode === 'VOICE') {
       startVoiceService();
       startHudAnimation();
    } else {
       stopVoiceService();
       if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, [mode]);

  // Video Streaming to Live Service with Motion Detection
  useEffect(() => {
      let interval: any;
      if (mode === 'VOICE' && !liveError && liveServiceRef.current) {
          interval = setInterval(async () => {
              const frame = captureFrameData(640); // Increased resolution for better analysis
              if (frame) {
                  // Check for motion to trigger analysis
                  const hasMotion = detectMotion(frame.data);
                  
                  // Always send frames but prioritize when motion detected
                  const success = liveServiceRef.current?.sendVideoFrame(frame.data);
                  
                  if (hasMotion && !success && !liveError) {
                      // Fallback to Gemini Service if LiveService fails but no error
                      try {
                          setLiveStatus("Analyse läuft (Fallback)");
                          const result = await analyzeItemImage(frame.data, frame.mimeType);
                          
                          // Create a mock LiveLogItem from the analysis result
                          const newItem: LiveLogItem = {
                            id: crypto.randomUUID(),
                            timestamp: Date.now(),
                            text: `Erkannt: ${result.adData.title} - ${result.adData.description.substring(0, 100)}...`,
                            imageSnapshot: frame.data
                          };
                          
                          setLiveHistory(prev => [newItem, ...prev]);
                          setLiveStatus("Analyse abgeschlossen");
                          frameCounterRef.current++;
                          
                      } catch (error) {
                          console.error("Fallback analysis failed:", error);
                          setLiveStatus("Analyse fehlgeschlagen");
                      }
                  } else if (hasMotion && success) {
                      frameCounterRef.current++;
                      setLiveStatus("Analyse läuft");
                  }
              }
          }, 300); // Increased to ~3.33 fps for better responsiveness
      }
      return () => clearInterval(interval);
  }, [mode, liveError]);

  // Motion Detection Algorithm
  const detectMotion = (currentFrame: string): boolean => {
    if (!lastFrameRef.current) {
      lastFrameRef.current = currentFrame;
      return false;
    }

    // Simple pixel difference comparison
    const lastHash = simpleHash(lastFrameRef.current);
    const currentHash = simpleHash(currentFrame);
    const diff = Math.abs(lastHash - currentHash);
    
    // Update motion detection history
    motionDetectionRef.current.shift();
    motionDetectionRef.current.push(diff);
    
    // Calculate average difference over last 10 frames
    const avgDiff = motionDetectionRef.current.reduce((a, b) => a + b, 0) / motionDetectionRef.current.length;
    
    // Update last frame
    lastFrameRef.current = currentFrame;
    
    // Trigger analysis if significant motion detected
    const motionThreshold = 1000; // Adjustable sensitivity
    return avgDiff > motionThreshold;
  };

  // Simple hash function for image comparison
  const simpleHash = (base64String: string): number => {
    let hash = 0;
    for (let i = 0; i < base64String.length && i < 1000; i += 10) { // Sample every 10th character
      hash = ((hash << 5) - hash) + base64String.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  // Manual Analysis Trigger with Fallback
  const triggerManualAnalysis = async () => {
    if (mode === 'VOICE') {
      const frame = captureFrameData(800); // High quality for manual analysis
      if (frame) {
        // First try LiveService
        if (!liveError && liveServiceRef.current) {
          const success = liveServiceRef.current.sendVideoFrame(frame.data);
          if (success) {
            setLiveStatus("Manuelle Analyse gestartet");
            frameCounterRef.current++;
            return;
          }
        }
        
        // Fallback to Gemini Service if LiveService fails
        try {
          setLiveStatus("Analyse läuft (Fallback)");
          const result = await analyzeItemImage(frame.data, frame.mimeType);
          
          // Create a mock LiveLogItem from the analysis result
          const newItem: LiveLogItem = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            text: `Erkannt: ${result.adData.title} - ${result.adData.description.substring(0, 100)}...`,
            imageSnapshot: frame.data
          };
          
          setLiveHistory(prev => [newItem, ...prev]);
          setLiveStatus("Analyse abgeschlossen");
          frameCounterRef.current++;
          
        } catch (error) {
          console.error("Fallback analysis failed:", error);
          setLiveStatus("Analyse fehlgeschlagen");
        }
      }
    }
  };

  const startHudAnimation = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanLineY = 0;
    let scanDirection = 1;
    let rotation = 0;

    const animate = () => {
       if (mode !== 'VOICE') return;
       
       canvas.width = canvas.parentElement?.clientWidth || 640;
       canvas.height = canvas.parentElement?.clientHeight || 360;
       const w = canvas.width;
       const h = canvas.height;
       const centerX = w / 2;
       const centerY = h / 2;

       ctx.clearRect(0, 0, w, h);

       // 1. Scanner Line Effect (Green Laser)
       scanLineY += 3 * scanDirection;
       if (scanLineY > h) scanDirection = -1;
       if (scanLineY < 0) scanDirection = 1;

       const gradient = ctx.createLinearGradient(0, scanLineY, 0, scanLineY + 20);
       gradient.addColorStop(0, 'rgba(0, 255, 100, 0)');
       gradient.addColorStop(0.5, 'rgba(0, 255, 100, 0.2)');
       gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
       ctx.fillStyle = gradient;
       ctx.fillRect(0, scanLineY, w, 40);

       // 2. Audio Levels Logic
       const inVol = audioLevelsRef.current.input * 5;
       const outVol = audioLevelsRef.current.output * 5;
       const isAiSpeaking = outVol > 0.05;
       const isUserSpeaking = inVol > 0.05;

       // 3. Central HUD Reticle
       const baseRadius = Math.min(w, h) * 0.25;
       const pulse = Math.sin(Date.now() / 200) * 5;
       
       ctx.lineWidth = 2;
       if (isAiSpeaking) {
           // Locked On State (Green)
           ctx.strokeStyle = `rgba(0, 255, 120, ${0.8 + outVol})`;
           ctx.shadowBlur = 15;
           ctx.shadowColor = '#00ff78';
           rotation += 0.02;
           
           // Box corners (Object Detection Simulation)
           const boxSize = baseRadius + pulse;
           ctx.beginPath();
           const cornerLen = 30;
           // Top Left
           ctx.moveTo(centerX - boxSize, centerY - boxSize + cornerLen);
           ctx.lineTo(centerX - boxSize, centerY - boxSize);
           ctx.lineTo(centerX - boxSize + cornerLen, centerY - boxSize);
           // Top Right
           ctx.moveTo(centerX + boxSize - cornerLen, centerY - boxSize);
           ctx.lineTo(centerX + boxSize, centerY - boxSize);
           ctx.lineTo(centerX + boxSize, centerY - boxSize + cornerLen);
           // Bottom Right
           ctx.moveTo(centerX + boxSize, centerY + boxSize - cornerLen);
           ctx.lineTo(centerX + boxSize, centerY + boxSize);
           ctx.lineTo(centerX + boxSize - cornerLen, centerY + boxSize);
           // Bottom Left
           ctx.moveTo(centerX - boxSize + cornerLen, centerY + boxSize);
           ctx.lineTo(centerX - boxSize, centerY + boxSize);
           ctx.lineTo(centerX - boxSize, centerY + boxSize - cornerLen);
           ctx.stroke();

           // Dynamic Label near Object
           ctx.fillStyle = "#00ff78";
           ctx.font = "bold 12px monospace";
           ctx.fillText("OBJECT DETECTED", centerX - boxSize, centerY - boxSize - 10);
           ctx.font = "10px monospace";
           ctx.fillText(`CONFIDENCE: ${Math.min(99, Math.floor(50 + outVol * 100))}%`, centerX - boxSize, centerY - boxSize + 15);
           
       } else {
           // Idle/Scanning State (White/Red)
           ctx.strokeStyle = isUserSpeaking ? `rgba(255, 100, 100, 0.8)` : `rgba(255, 255, 255, 0.3)`;
           ctx.shadowBlur = 0;
           rotation += 0.005;

           // Arc segments
           ctx.beginPath();
           ctx.arc(centerX, centerY, baseRadius, rotation, rotation + Math.PI / 2);
           ctx.stroke();
           
           ctx.beginPath();
           ctx.arc(centerX, centerY, baseRadius, rotation + Math.PI, rotation + Math.PI * 1.5);
           ctx.stroke();

           // Center Dot
           ctx.fillStyle = isUserSpeaking ? "#ff4444" : "rgba(255, 255, 255, 0.5)";
           ctx.beginPath();
           ctx.arc(centerX, centerY, isUserSpeaking ? 4 : 2, 0, Math.PI * 2);
           ctx.fill();
       }

       // 4. Waveform Visualization (Bottom)
       const barCount = 40;
       const barWidth = w / barCount;
       for (let i = 0; i < barCount; i++) {
           const wave = Math.sin(i * 0.5 + Date.now() / 150);
           // Combine input and output volume for visual activity
           const combinedActivity = Math.max(0.05, inVol * 1.5 + outVol * 2);
           const hBar = Math.max(4, combinedActivity * 100 * Math.abs(wave));
           
           const x = i * barWidth;
           const y = h - hBar;
           
           ctx.fillStyle = isAiSpeaking ? '#00ff78' : (isUserSpeaking ? '#ff4444' : '#ffffff20');
           ctx.fillRect(x, y, barWidth - 2, hBar);
       }

       // 5. Side Graph (Simulation of Data Stream)
       // Update graph history
       graphHistoryRef.current.shift();
       graphHistoryRef.current.push(inVol + outVol);
       
       const graphW = 80;
       const graphH = 50;
       const graphX = w - graphW - 20;
       const graphY = 80;

       ctx.strokeStyle = "rgba(0, 255, 120, 0.5)";
       ctx.lineWidth = 1;
       ctx.beginPath();
       ctx.moveTo(graphX, graphY + graphH);
       for(let i=0; i<graphHistoryRef.current.length; i++) {
           const val = graphHistoryRef.current[i];
           const px = graphX + (i / graphHistoryRef.current.length) * graphW;
           const py = (graphY + graphH) - (val * graphH);
           ctx.lineTo(px, py);
       }
       ctx.stroke();
       
       // Graph Label
       ctx.fillStyle = "rgba(0, 255, 120, 0.8)";
       ctx.font = "9px monospace";
       ctx.fillText("DATA STREAM", graphX, graphY - 5);


       // 6. Text Status (Top Left)
       ctx.font = "12px monospace";
       ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
       ctx.fillText(`SYSTEM : ${liveStatus.toUpperCase()}`, 20, 30);
       
       // Icons/Indicators
       ctx.fillStyle = isUserSpeaking ? "#ff4444" : "#555";
       ctx.fillText(`MIC ${isUserSpeaking ? "ON" : "OFF"}`, 20, 50);
       
       ctx.fillStyle = isAiSpeaking ? "#00ff78" : "#555";
       ctx.fillText(`SPK ${isAiSpeaking ? "ACT" : "IDL"}`, 80, 50);

       animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const stopVoiceService = () => {
     if (liveServiceRef.current) {
         liveServiceRef.current.disconnect();
         liveServiceRef.current = null;
     }
  };

  const startVoiceService = async () => {
        console.log('[DEBUG] ImageUploader.startVoiceService() gestartet');
        const key = getStoredGoogleKey();
        console.log('[DEBUG] ImageUploader: Google Key abgerufen:', !!key, 'Länge:', key?.length);
        
        if (!key) {
            console.error('[DEBUG] FEHLER: Google API Key nicht verfügbar, wechsle zu PHOTO-Mode');
            alert("Für den Sprachmodus benötigst du einen Google Gemini API Key (siehe Einstellungen).");
            setMode('PHOTO');
            return;
        }

       setLiveError(false);
       setLiveStatus("Verbinde...");
       setLiveHistory([]); // Clear history on new session
       
       const service = new LiveService(
           (status, isErr) => {
              setLiveStatus(status);
              if (isErr) setLiveError(true);
           },
           (inVol, outVol) => {
               audioLevelsRef.current = { input: inVol, output: outVol };
           },
           (text, isFinal) => {
               setCurrentTranscription(text);
               
               if (isFinal) {
                   // Capture snapshot when a turn completes
                   const snapshot = captureFrameData(300); // Smaller snapshot
                   if (snapshot && text.length > 5) { // Only save substantial text
                       const newItem: LiveLogItem = {
                           id: crypto.randomUUID(),
                           timestamp: Date.now(),
                           text: text,
                           imageSnapshot: snapshot.data
                       };
                       setLiveHistory(prev => [newItem, ...prev]);
                       setCurrentTranscription(""); // Reset current text
                   }
               }
           }
       );
       
       liveServiceRef.current = service;
       await service.connect(key);
  };

  const startCamera = async () => {
    try {
      setPermissionError(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Camera failed", err);
      setPermissionError(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrameData = (maxWidth: number = 0) => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return null;
      
      let w = video.videoWidth;
      let h = video.videoHeight;

      if (maxWidth > 0 && w > maxWidth) {
          const ratio = maxWidth / w;
          w = maxWidth;
          h = h * ratio;
      }

      canvas.width = w;
      canvas.height = h;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        return {
          data: dataUrl.split(',')[1],
          mimeType: 'image/jpeg'
        };
      }
    }
    return null;
  };

  const capturePhoto = () => {
    const frame = captureFrameData(0);
    if (frame) {
      stopCamera();
      stopVoiceService();
      onImageSelected(frame.data, frame.mimeType);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const mimeType = base64String.substring(base64String.indexOf(':') + 1, base64String.indexOf(';'));
      stopCamera();
      stopVoiceService();
      onImageSelected(base64String.split(',')[1], mimeType);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Process a history item into the main editor
  const handleProcessHistoryItem = (item: LiveLogItem) => {
      stopCamera();
      stopVoiceService();
      onImageSelected(item.imageSnapshot, "image/jpeg");
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Mode Switcher */}
      <div className="flex bg-slate-900 p-1 rounded-xl relative w-full md:w-80 border border-slate-700 self-center">
          <button
            onClick={() => setMode('PHOTO')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${mode === 'PHOTO' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Camera size={16} /> Kamera
          </button>
          <button
            onClick={() => setMode('VOICE')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${mode === 'VOICE' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'text-slate-400 hover:text-white'}`}
          >
             <Radio size={16} className={mode === 'VOICE' ? "animate-pulse" : ""} /> Live Talk
          </button>
      </div>

      <div className={`grid gap-6 ${mode === 'VOICE' ? 'lg:grid-cols-3' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
        
        {/* Camera Area - Spans 2 cols in Voice mode */}
        <div className={`${mode === 'VOICE' ? 'lg:col-span-2' : 'w-full'} aspect-video relative bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700 group flex items-center justify-center`}>
          
          {!permissionError ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* AR HUD Overlay for Voice Mode */}
              {mode === 'VOICE' && (
                  <>
                    <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 w-full h-full z-20 pointer-events-none"
                    />
                    {/* Live Transcription Overlay */}
                    <div className="absolute bottom-16 left-0 right-0 px-8 text-center z-30 pointer-events-none">
                       {currentTranscription && (
                           <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-xl inline-block border border-green-500/30 shadow-lg animate-fade-in-up">
                               <p className="text-lg font-medium leading-relaxed font-mono">
                                   <span className="text-green-400 mr-2">{'>'}</span>
                                   {currentTranscription}
                                   <span className="animate-pulse">_</span>
                               </p>
                           </div>
                       )}
                    </div>
                  </>
              )}

              {/* Capture Button (Only in Photo Mode) */}
              {mode === 'PHOTO' && (
                <div className="absolute bottom-8 w-full flex justify-center items-center z-30 pointer-events-auto">
                  <button
                    onClick={capturePhoto}
                    className="group relative"
                    title="Foto machen & Analysieren"
                  >
                    <div className="w-20 h-20 rounded-full border-4 border-white/80 bg-white/10 flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 hover:bg-white/20">
                        <div className="w-16 h-16 rounded-full bg-white transition-all duration-300 shadow-inner group-hover:scale-90" />
                    </div>
                  </button>
                </div>
              )}
              
              {/* Manual Analysis Button (Only in Voice Mode) */}
              {mode === 'VOICE' && (
                <div className="absolute bottom-8 left-8 right-8 flex justify-center z-30 pointer-events-auto">
                  <button
                    onClick={triggerManualAnalysis}
                    disabled={liveError}
                    className="group relative"
                    title="Sofortige Bildanalyse starten"
                  >
                    <div className={`w-24 h-24 rounded-full border-4 border-green-500/30 ${
                      liveError ? 'bg-slate-600' : 'bg-green-500/20 hover:bg-green-500/30'
                    } flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95`}>
                        <Play size={20} className={liveError ? 'text-slate-500' : 'text-green-400'} />
                    </div>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8">
              <Camera size={48} className="mx-auto mb-4 text-slate-600"/>
              <h3 className="text-xl font-bold text-white mb-2">Kein Kamerazugriff</h3>
              <button onClick={startCamera} className="bg-green-600 px-4 py-2 rounded text-white mt-4">Erneut versuchen</button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Live Analysis History Panel */}
        {mode === 'VOICE' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[60vh] lg:h-auto">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Activity size={18} className="text-green-400" />
                        Live Analyse
                    </h3>
                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{liveHistory.length} Events</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {liveHistory.length === 0 ? (
                        <div className="text-center text-slate-500 py-10 flex flex-col items-center">
                            <Activity size={32} className="mb-3 opacity-60 animate-pulse" />
                            <p className="text-sm font-medium">Live-Analyse aktiv</p>
                            <p className="text-xs mt-1 opacity-60">Die KI analysiert automatisch, wenn Bewegung im Bild erkannt wird</p>
                            <div className="mt-4 flex gap-2 text-xs opacity-50">
                                <span>• Spreche mit der KI</span>
                                <span>• Bewege Gegenstände vor der Kamera</span>
                                <span>• Nutze den Play-Button für sofortige Analyse</span>
                            </div>
                        </div>
                    ) : (
                        liveHistory.map((item) => (
                            <div key={item.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700 hover:border-slate-500 transition-colors group animate-fade-in">
                                <div className="flex gap-3 mb-3">
                                    <img
                                        src={`data:image/jpeg;base64,${item.imageSnapshot}`}
                                        className="w-16 h-16 object-cover rounded-lg bg-black border border-slate-600"
                                        alt="Snapshot"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Clock size={10} /> {new Date(item.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                                            "{item.text}"
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleProcessHistoryItem(item)}
                                    className="w-full bg-slate-700 hover:bg-green-600 text-slate-300 hover:text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    Als Inserat anlegen <ChevronRight size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* Upload Area (Only Photo Mode) */}
        {mode === 'PHOTO' && (
          <div
            className="w-full mt-4 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-center gap-4 p-6 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 hover:bg-slate-800/80 transition-all group">
                <Upload size={24} className="text-slate-400 group-hover:text-green-400" />
                <span className="text-slate-400 group-hover:text-white font-medium">Bild hochladen (Drag & Drop)</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
