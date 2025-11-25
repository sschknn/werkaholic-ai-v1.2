
import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ResultEditor } from './components/ResultEditor';
import { SavedItemsList } from './components/SavedItemsList';
import { Sidebar } from './components/Sidebar';
import { MarketView } from './components/MarketView';
import { SettingsView } from './components/SettingsView';
import { analyzeItemImage, getStoredApiKey, setStoredApiKey } from './services/geminiService';
import { downloadBackup, importBackupFromFile } from './services/storageService';
import { AdData, AppState, GroundingSource, SavedItem } from './types';
import { Zap, Bookmark, Menu, X, CheckCircle, Info, AlertCircle, BarChart3, Key, Settings, Cloud, HardDrive, Radio } from 'lucide-react';
import { AppIcon } from './components/AppIcon';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<{ data: AdData, sources: GroundingSource[] } | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [mimeTypeData, setMimeTypeData] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  
  // API Key Management (Initial setup)
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredApiKey() || "");
  
  // Notification / Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  // Saved Items State
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const saved = localStorage.getItem('kleinanzeigen-saved-items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);
  const isCurrentItemSaved = currentEditingId !== null && savedItems.some(item => item.id === currentEditingId);

  // Init Key Logic - Check if missing
  useEffect(() => {
    const key = getStoredApiKey();
    if (!key) {
      setShowKeyModal(true);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('kleinanzeigen-saved-items', JSON.stringify(savedItems));
    } catch (e) {
        console.error("Storage limit reached", e);
        showToast("Speicher voll! Alte Einträge löschen.", "error");
    }
  }, [savedItems]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
  };

  const handleSaveApiKey = async (newKey: string) => {
    const validKey = newKey.trim();
    if (validKey.length > 0) {
      setStoredApiKey(validKey);
      setApiKeyInput(validKey);
      setShowKeyModal(false);
      showToast("OpenRouter Key dauerhaft gespeichert", "success");
    }
  };

  // Main Entry Point: User selects/captures image
  const handleImageSelected = async (base64: string, mimeType: string) => {
    setImageData(base64);
    setMimeTypeData(mimeType);
    setErrorMsg(null);
    setCurrentEditingId(null);
    setLoadingText(null);
    
    // Direct analysis - removed the "Question" step for speed
    proceedToAnalysis(base64, mimeType);
  };

  // Full Analysis with Auto-Retry
  const proceedToAnalysis = async (base64: string, mimeType: string, retryCount = 0) => {
    setAppState(AppState.ANALYZING);
    
    if (retryCount === 0) {
       setLoadingText(null);
    }

    try {
      // Pass empty object as we removed user answers
      const result = await analyzeItemImage(base64, mimeType);
      
      // Success
      setAnalysisResult({ data: result.adData, sources: result.sources });
      setAppState(AppState.EDITING);
      setLoadingText(null);
      
    } catch (err: any) {
      console.error(err);
      
      // Critical Auth Errors -> Stop and ask for key
      if (err.message === "API_KEY_MISSING" || err.message === "AUTH_ERROR") {
        setAppState(AppState.IDLE);
        setShowKeyModal(true);
        setErrorMsg("Authentifizierung fehlgeschlagen. Bitte Key prüfen.");
        showToast("Bitte API Key eingeben", "error");
        setLoadingText(null);
        return;
      }
      
      // Infinite Retry Loop for ALL other errors (Rate Limit, Server Error)
      const waitTime = 5000;
      setLoadingText(`Server ausgelastet. Neuer Versuch in 5s... (Versuch ${retryCount + 1})`);
      
      console.log(`Analysis failed (${err.message}). Retrying in ${waitTime}ms...`);
      
      setTimeout(() => {
          proceedToAnalysis(base64, mimeType, retryCount + 1);
      }, waitTime);
    }
  };

  const handleSaveToggle = async (currentAdData: AdData) => {
    if (!analysisResult || !imageData) return;

    if (currentEditingId) {
      // Toggle OFF (Remove)
      const exists = savedItems.find(item => item.id === currentEditingId);
      if (exists) {
        setSavedItems(prev => prev.filter(item => item.id !== currentEditingId));
        setCurrentEditingId(null);
        showToast("Artikel entfernt", "info");
        return;
      }
    }

    // Toggle ON (Save)
    // Compress Image for LocalStorage
    let savedImage = imageData;
    try {
        savedImage = await new Promise((resolve) => {
            const img = new Image();
            img.src = `data:image/jpeg;base64,${imageData}`;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_SIZE = 800; // Resize to save storage
                let w = img.width;
                let h = img.height;
                if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
                else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
                canvas.width = w;
                canvas.height = h;
                ctx?.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
            };
            img.onerror = () => resolve(imageData || "");
        });
    } catch(e) { console.warn("Compression failed", e); }

    const newId = crypto.randomUUID();
    const newItem: SavedItem = {
      id: newId,
      timestamp: Date.now(),
      adData: currentAdData,
      sources: analysisResult.sources,
      imageData: savedImage
    };

    setSavedItems(prev => [newItem, ...prev]);
    setCurrentEditingId(newId);
    showToast("Lokal gespeichert", "success");
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedItems(prev => prev.filter(item => item.id !== id));
    showToast("Artikel gelöscht", "info");
  };

  const handleSelectSavedItem = (item: SavedItem) => {
    setAnalysisResult({ data: item.adData, sources: item.sources });
    setImageData(item.imageData);
    setMimeTypeData('image/jpeg');
    setCurrentEditingId(item.id);
    setAppState(AppState.EDITING);
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setAnalysisResult(null);
    setImageData(null);
    setMimeTypeData(null);
    setErrorMsg(null);
    setCurrentEditingId(null);
    setLoadingText(null);
  };

  const handleStateChange = (newState: AppState) => {
    if (newState === AppState.IDLE && appState !== AppState.IDLE) handleReset();
    else if (newState === AppState.LIVESCAN && appState !== AppState.LIVESCAN) {
        setAppState(AppState.LIVESCAN);
        // Clear previous data when entering live scan
        setAnalysisResult(null);
        setImageData(null);
    }
    else setAppState(newState);
    
    setIsMobileMenuOpen(false);
    setShowSettings(false);
  };
  
  const openSettings = () => {
    setShowSettings(true);
    setIsMobileMenuOpen(false);
  };
  
  // Backup Handlers
  const handleBackupDownload = () => {
    try {
        downloadBackup(savedItems);
        showToast("Backup Datei erstellt", "success");
    } catch(e) {
        showToast("Fehler beim Backup", "error");
    }
  };

  const handleBackupImport = async (file: File) => {
      try {
          const items = await importBackupFromFile(file);
          setSavedItems(prev => {
              const existingIds = new Set(prev.map(i => i.id));
              const newItems = items.filter(i => !existingIds.has(i.id));
              return [...newItems, ...prev];
          });
          showToast(`${items.length} Einträge importiert`, "success");
      } catch(e) {
          showToast("Import fehlgeschlagen: " + (e as Error).message, "error");
      }
  };

  // Settings View
  if (showSettings) {
      return (
        <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200">
             {toast && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60] animate-fade-in-up w-auto">
                    <div className={`px-6 py-3 rounded-full shadow-2xl border backdrop-blur-md flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-900/90 border-green-700' : toast.type === 'error' ? 'bg-red-900/90 border-red-700' : 'bg-slate-800/90 border-slate-600'}`}>
                        {toast.type === 'success' ? <CheckCircle size={16}/> : toast.type === 'error' ? <AlertCircle size={16}/> : <Info size={16}/>}
                        {toast.message}
                    </div>
                </div>
             )}
             
             <Sidebar
                activeState={appState}
                onChangeState={handleStateChange}
                savedCount={savedItems.length}
                onShowMessage={showToast}
                onOpenSettings={openSettings}
             />
             
             <div className="p-4">
                 <button onClick={() => setShowSettings(false)} className="lg:hidden mb-4 text-slate-400 flex items-center gap-2">← Zurück</button>
                 <SettingsView
                     currentApiKey={apiKeyInput}
                     onSave={handleSaveApiKey}
                     onExport={handleBackupDownload}
                     onImport={handleBackupImport}
                 />
             </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200">
      
      {/* Setup Modal */}
      {showKeyModal && !showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full">
            <div className="w-12 h-12 bg-indigo-900/50 rounded-xl flex items-center justify-center mb-6 text-indigo-400">
              <Key size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Setup erforderlich</h2>
            <p className="text-slate-400 mb-6">
              Bitte gib deinen OpenRouter API Key ein.
            </p>
            
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-or-..."
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-6 font-mono"
            />
            
            <button
              onClick={() => handleSaveApiKey(apiKeyInput)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
            >
              Speichern & Starten
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60] animate-fade-in-up w-auto max-w-sm text-center">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border ${
            toast.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
            toast.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
            'bg-slate-800/90 border-slate-600 text-white'
          } backdrop-blur-md`}>
            {toast.type === 'success' && <CheckCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'info' && <Cloud size={18} className="flex-shrink-0" />}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      <Sidebar
        activeState={appState}
        onChangeState={handleStateChange}
        savedCount={savedItems.length}
        onShowMessage={showToast}
        onOpenSettings={openSettings}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-40 relative">
           <div className="flex items-center gap-3" onClick={handleReset}>
              <div className="shadow-lg shadow-green-900/20 rounded-xl">
                 <AppIcon size={32} />
              </div>
              <span className="font-bold text-white text-lg">Genius AI</span>
           </div>
           <div className="flex items-center gap-3">
             <button onClick={() => handleStateChange(AppState.BOOKMARKS)} className="relative p-2">
                <Bookmark size={24} className={appState === AppState.BOOKMARKS ? 'text-green-500' : 'text-slate-400'}/>
                {savedItems.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900"/>}
             </button>
             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
             </button>
           </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
           <div className="lg:hidden absolute top-[73px] left-0 w-full h-[calc(100%-73px)] bg-slate-900 z-50 p-4 animate-fade-in flex flex-col">
              <nav className="space-y-3">
                 <button onClick={() => handleStateChange(AppState.IDLE)} className="w-full flex items-center gap-3 p-4 bg-slate-800 rounded-xl font-bold">
                    <Zap size={20} className="text-slate-400"/> Foto Scanner
                 </button>
                 <button onClick={() => handleStateChange(AppState.LIVESCAN)} className="w-full flex items-center gap-3 p-4 bg-slate-800 rounded-xl font-bold">
                    <Radio size={20} className="text-red-400"/> Live Scanner
                 </button>
                 <button onClick={() => handleStateChange(AppState.BOOKMARKS)} className="w-full flex items-center gap-3 p-4 bg-slate-800 rounded-xl font-bold">
                    <Bookmark size={20} className="text-slate-400"/> Gespeichert <span className="ml-auto bg-green-600 text-xs px-2 py-0.5 rounded-full text-white">{savedItems.length}</span>
                 </button>
                 <button onClick={() => handleStateChange(AppState.MARKET)} className="w-full flex items-center gap-3 p-4 bg-slate-800 rounded-xl font-bold">
                    <BarChart3 size={20} className="text-slate-400"/> Markt Übersicht
                 </button>
                 <div className="pt-4 border-t border-slate-800 mt-4">
                    <button onClick={openSettings} className="w-full flex items-center gap-3 p-4 bg-indigo-900/20 rounded-xl font-bold text-indigo-400">
                        <Settings size={20} /> Einstellungen
                    </button>
                 </div>
              </nav>
           </div>
        )}

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative">
          
          {(appState === AppState.IDLE || appState === AppState.LIVESCAN) && (
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                        {appState === AppState.LIVESCAN ? "Live Scanner" : "Foto Scanner"}
                    </h2>
                    <p className="text-slate-400">
                        {appState === AppState.LIVESCAN
                            ? "Echtzeit-Analyse & Sprachsteuerung mit Gemini Live."
                            : "Foto machen oder hochladen für automatische Inserat-Erstellung."}
                    </p>
                </div>
              </div>
              <ImageUploader
                onImageSelected={handleImageSelected}
                initialMode={appState === AppState.LIVESCAN ? 'VOICE' : 'PHOTO'}
              />
            </div>
          )}

          {appState === AppState.ANALYZING && (
            <LoadingOverlay message={loadingText} />
          )}

          {appState === AppState.EDITING && analysisResult && imageData && (
            <ResultEditor
              data={analysisResult.data}
              sources={analysisResult.sources}
              imageData={imageData}
              isSaved={isCurrentItemSaved}
              onReset={handleReset}
              onSave={handleSaveToggle}
              onShowMessage={showToast}
            />
          )}

          {appState === AppState.BOOKMARKS && (
            <SavedItemsList
              items={savedItems}
              onSelect={handleSelectSavedItem}
              onDelete={handleDeleteItem}
              onClose={handleReset}
            />
          )}

          {appState === AppState.MARKET && (
            <MarketView
              items={savedItems}
              onNavigateToScanner={handleReset}
            />
          )}

          {appState === AppState.ERROR && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md bg-slate-800 p-8 rounded-2xl shadow-xl border border-red-900/50">
                <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="text-red-500 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fehler bei der Analyse</h3>
                <p className="text-slate-400 mb-6">{errorMsg}</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleReset}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Neustart
                  </button>
                  {errorMsg?.includes("Authentifizierung") && (
                    <button
                        onClick={openSettings}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Key Eingeben
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;