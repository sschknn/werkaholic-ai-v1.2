
import React, { useState, useRef, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, CheckCircle, ExternalLink, HardDrive, Download, Upload, Mic, Volume2 } from 'lucide-react';
import { getStoredGoogleKey, setStoredGoogleKey } from '../services/liveService';

interface SettingsViewProps {
  currentApiKey: string;
  onSave: (key: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentApiKey, onSave, onExport, onImport }) => {
  // OpenRouter State
  const [key, setKey] = useState(currentApiKey);
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Google API Key State
  const [googleKey, setGoogleKey] = useState("");
  const [isGoogleVisible, setIsGoogleVisible] = useState(false);
  const [isGoogleSaved, setIsGoogleSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with prop if it changes
  useEffect(() => {
    setKey(currentApiKey);
    const storedGoogle = getStoredGoogleKey();
    if (storedGoogle) setGoogleKey(storedGoogle);
  }, [currentApiKey]);

  const handleSaveKey = () => {
    onSave(key);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveGoogleKey = () => {
    setStoredGoogleKey(googleKey);
    setIsGoogleSaved(true);
    setTimeout(() => setIsGoogleSaved(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onImport(e.target.files[0]);
          e.target.value = ''; // Reset input
      }
  };

  const handleTestAudio = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Das ist ein Test für die Sprachausgabe.");
    utterance.lang = 'de-DE';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 animate-fade-in pb-20">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Einstellungen</h2>
        <p className="text-slate-400">Verwalte deine API-Verbindung und lokalen Daten.</p>
      </div>

      <div className="space-y-8">
        
        {/* OpenRouter API Key Section */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-900/50 p-3 rounded-lg text-indigo-400">
              <Key size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">OpenRouter API Key</h3>
              <p className="text-sm text-slate-400">Notwendig für die KI-Analyse. Nutzt kostenlose Modelle.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="relative flex items-center">
                <input
                  type={isVisible ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
                <button
                  onClick={() => setIsVisible(!isVisible)}
                  className="absolute right-3 text-slate-500 hover:text-indigo-400 transition-colors"
                  type="button"
                >
                  {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <a 
                href="https://openrouter.ai/keys" 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 hover:underline"
              >
                Key bei OpenRouter erstellen <ExternalLink size={14} />
              </a>

              <button
                onClick={handleSaveKey}
                disabled={key === currentApiKey}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
                  isSaved 
                    ? 'bg-green-600 text-white' 
                    : key !== currentApiKey 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSaved ? <><CheckCircle size={18} /> Gespeichert</> : <><Save size={18} /> Speichern</>}
              </button>
            </div>
          </div>
        </div>

        {/* Google Gemini API Key Section (For Live Voice) */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-900/30 p-3 rounded-lg text-red-400">
              <Mic size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Google Gemini API Key</h3>
              <p className="text-sm text-slate-400">Erforderlich für den Live Sprach-Modus (Gemini 2.5).</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="relative flex items-center">
                <input
                  type={isGoogleVisible ? "text" : "password"}
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                />
                <button
                  onClick={() => setIsGoogleVisible(!isGoogleVisible)}
                  className="absolute right-3 text-slate-500 hover:text-red-400 transition-colors"
                  type="button"
                >
                  {isGoogleVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1 hover:underline"
              >
                Key bei Google AI Studio erstellen <ExternalLink size={14} />
              </a>

              <div className="flex gap-2">
                <button
                    onClick={handleTestAudio}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all bg-slate-700 hover:bg-slate-600 text-slate-200"
                    title="Testet die System-Sprachausgabe"
                >
                    <Volume2 size={18} /> Test Audio
                </button>

                <button
                    onClick={handleSaveGoogleKey}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
                    isGoogleSaved 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20'
                    }`}
                >
                    {isGoogleSaved ? <><CheckCircle size={18} /> Gespeichert</> : <><Save size={18} /> Speichern</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Local Backup Section */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full pointer-events-none"></div>

           <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="bg-blue-900/50 p-3 rounded-lg text-blue-400">
                <HardDrive size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Lokale Datensicherung</h3>
                <p className="text-sm text-slate-400">Sichere deine Inserate als Datei auf diesem PC.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <button 
                onClick={onExport}
                className="bg-slate-900 hover:bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-xl p-4 flex items-center gap-4 transition-all group text-left"
              >
                 <div className="bg-green-900/20 p-3 rounded-full text-green-400 group-hover:bg-green-900/40">
                    <Download size={24} />
                 </div>
                 <div>
                    <h4 className="font-bold text-white">Backup erstellen</h4>
                    <p className="text-xs text-slate-500">Alle Daten als .json Datei herunterladen</p>
                 </div>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-900 hover:bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-xl p-4 flex items-center gap-4 transition-all group text-left"
              >
                 <div className="bg-blue-900/20 p-3 rounded-full text-blue-400 group-hover:bg-blue-900/40">
                    <Upload size={24} />
                 </div>
                 <div>
                    <h4 className="font-bold text-white">Daten importieren</h4>
                    <p className="text-xs text-slate-500">Backup Datei wiederherstellen</p>
                 </div>
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
           </div>
        </div>

      </div>
    </div>
  );
};
