
import React, { useState, useEffect, useRef } from 'react';
import { AdData, GroundingSource } from '../types';
import { Copy, Check, ExternalLink, RefreshCw, Euro, Tag, Share2, Info, Volume2, StopCircle, Bookmark, FileText, Image as ImageIcon, Download, Archive } from 'lucide-react';
import { jsPDF } from "jspdf";
import JSZip from 'jszip';
import * as FileSaverPkg from 'file-saver';

// Robust helper for saving files that handles different module export types
const saveFile = (blob: Blob | string, name: string) => {
    try {
        // Handle various import scenarios for FileSaver (Default export vs Named vs Direct function)
        const saver = (FileSaverPkg as any).default || FileSaverPkg;
        const saveFunc = saver.saveAs || saver;

        if (typeof saveFunc === 'function') {
            saveFunc(blob, name);
        } else {
             // DOM Fallback
             throw new Error("FileSaver function not found");
        }
    } catch (e) {
        console.warn("FileSaver failed, trying DOM fallback", e);
        const link = document.createElement("a");
        link.href = typeof blob === 'string' ? blob : URL.createObjectURL(blob as Blob);
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

interface ResultEditorProps {
  data: AdData;
  sources: GroundingSource[];
  imageData: string;
  isSaved: boolean;
  onReset: () => void;
  onSave: (currentAd: AdData) => void;
  onShowMessage: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ResultEditor: React.FC<ResultEditorProps> = ({ data, sources, imageData, isSaved, onReset, onSave, onShowMessage }) => {
  const [ad, setAd] = useState<AdData>(data);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  
  // Keep reference to prevent Garbage Collection (Chrome Bug)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Update internal state when props data changes (e.g. loading from bookmarks)
  useEffect(() => {
    setAd(data);
  }, [data]);

  // Initialize Voices
  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoices(vs);
    };

    loadVoices();
    
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakText = (text: string) => {
    // 1. Cancel ongoing speech
    window.speechSynthesis.cancel(); 

    // 2. Add small delay before starting new speech to prevent "synthesis-failed"
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance; // Keep alive
    
        utterance.lang = 'de-DE';
        utterance.rate = 1.0;
        
        // Try to select a high quality German voice
        const deVoice = voices.find(v => v.lang === 'de-DE' && v.name.includes('Google')) || 
                        voices.find(v => v.lang.includes('de'));
        
        if (deVoice) utterance.voice = deVoice;
    
        utterance.onstart = () => setIsSpeaking(true);
        
        utterance.onend = () => {
            setIsSpeaking(false);
            utteranceRef.current = null;
        };
        
        utterance.onerror = (e) => {
          // Ignore intentional cancellations
          if (e.error === 'canceled' || e.error === 'interrupted') {
              setIsSpeaking(false);
              return;
          }

          console.error("TTS Error details:", e.error);
          
          if (e.error === 'synthesis-failed') {
             // Often transient in Electron/Chrome if called too fast
             console.warn("Audio driver busy (synthesis-failed)");
             // onShowMessage("Audio-Ausgabe momentan ausgelastet", "info"); // Suppress specific warning for auto-play UX
          } else if (e.error !== 'not-allowed') {
              onShowMessage(`Fehler Sprachausgabe: ${e.error}`, "error");
          }
          
          setIsSpeaking(false);
          utteranceRef.current = null;
        };
    
        window.speechSynthesis.speak(utterance);
    }, 100); 
  };

  // Auto-Play Effect
  useEffect(() => {
    // Only auto-play if:
    // 1. Voices are loaded (to ensure we can pick a German voice)
    // 2. It hasn't played yet in this session
    // 3. The item is NOT saved (meaning it's a fresh scan, not a bookmark)
    if (voices.length > 0 && !hasAutoPlayed && !isSaved) {
        setHasAutoPlayed(true);
        // Small delay to let the UI appear first
        setTimeout(() => {
            const textToRead = `${data.title}. Für ${data.suggestedPrice} Euro. ${data.description}`;
            speakText(textToRead);
        }, 800);
    }
  }, [voices, hasAutoPlayed, isSaved, data]);

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      utteranceRef.current = null;
    } else {
      // Read the current state of the ad
      speakText(`${ad.title}. Für ${ad.suggestedPrice} Euro. ${ad.description}`);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    if (field === 'share-all') {
        onShowMessage("Kompletter Text in die Zwischenablage kopiert!", "success");
    }
  };

  const getFormattedFullAd = () => {
    return `${ad.title}\n\nPreis: ${ad.suggestedPrice} €\n\n${ad.description}\n\n${ad.keywords.map(k => '#' + k).join(' ')}`;
  };

  const getSafeFilename = (name: string) => {
    // Allow dashes and underscores, trim more aggressively
    return name.replace(/[^a-z0-9äöüß \-_]/gi, '').trim().replace(/\s+/g, '_') || 'Artikel';
  };

  const createPDFDoc = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(ad.title, maxLineWidth);
    doc.text(titleLines, margin, 20);
    
    let yPos = 20 + (titleLines.length * 8);

    // Meta Info Row
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Preis: ${ad.suggestedPrice} €`, margin, yPos);
    doc.text(`Kategorie: ${ad.category}`, margin + 60, yPos);
    doc.text(`Zustand: ${ad.condition}`, margin + 120, yPos);
    
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Description
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Beschreibung:", margin, yPos);
    yPos += 7;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    // Replace emojis loosely as standard jsPDF font doesn't support them well
    const cleanDesc = ad.description.replace(/[\u{1F600}-\u{1F6FF}]/gu, ''); 
    const descLines = doc.splitTextToSize(cleanDesc, maxLineWidth);
    doc.text(descLines, margin, yPos);
    
    yPos += (descLines.length * 6) + 10;

    // Keywords
    if (ad.keywords.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(ad.keywords.map(k => `#${k}`).join("  "), margin, yPos);
    }
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Erstellt mit Kleinanzeigen Genius AI", margin, pageWidth - 10);
    
    return doc;
  };

  const handleShare = async () => {
    const fullText = getFormattedFullAd();
    
    // Use Web Share API if available (Mobile/Modern Browsers)
    if (navigator.share) {
      try {
        // Create a file from the image data to share along with text
        const fetchRes = await fetch(`data:image/jpeg;base64,${imageData}`);
        const blob = await fetchRes.blob();
        const safeName = getSafeFilename(ad.title);
        const file = new File([blob], `${safeName}.jpg`, { type: "image/jpeg" });

        const shareData: ShareData = {
          title: ad.title,
          text: fullText,
          files: [file]
        };

        // Check if file sharing is supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share(shareData);
             onShowMessage("Teilen-Menü geöffnet", "info");
        } else {
             // Fallback without file
             await navigator.share({
                title: ad.title,
                text: fullText
             });
             onShowMessage("Text-Teilen geöffnet", "info");
        }
        return;
      } catch (err) {
        console.log("Share cancelled or failed", err);
      }
    }
    
    // Fallback: Copy all to clipboard
    copyToClipboard(fullText, 'share-all');
  };

  const handlePostClick = () => {
    // Smart Action: Copy description automatically
    copyToClipboard(ad.description, 'auto-desc');
    
    // Enhanced posting URL with form pre-fill parameters for Kleinanzeigen
    const postUrl = generateKleinanzeigenPostUrl(ad);
    window.open(postUrl, '_blank');
    onShowMessage("Kleinanzeigen wird geöffnet & Text kopiert", "success");
  };

  const generateKleinanzeigenPostUrl = (adData: AdData): string => {
    // Kleinanzeigen form parameters mapping
    const params = new URLSearchParams();
    
    // Title parameter
    params.set('title', adData.title);
    
    // Description parameter (with line breaks converted to %0A for URL encoding)
    params.set('description', adData.description.replace(/\n/g, '%0A'));
    
    // Price parameter
    params.set('price', adData.suggestedPrice.toString());
    
    // Category - Kleinanzeigen uses specific category IDs, we'll use a general mapping
    const categoryMap: Record<string, string> = {
      'Elektronik': '1',
      'Kleidung': '2',
      'Möbel': '3',
      'Haushalt': '4',
      'Spielzeug': '5',
      'Bücher': '6',
      'Sport': '7',
      'Freizeit': '8',
      'Kraftfahrzeuge': '9',
      'Wohnen': '10'
    };
    
    const categoryId = categoryMap[adData.category] || '1'; // Default to Elektronik
    params.set('categoryId', categoryId);
    
    // Condition parameter mapping
    const conditionMap: Record<string, string> = {
      'Neu': 'new',
      'Sehr gut': 'very_good',
      'Gut': 'good',
      'In Ordnung': 'acceptable',
      'Defekt': 'defective'
    };
    
    const conditionValue = conditionMap[adData.condition] || 'good';
    params.set('condition', conditionValue);
    
    // Keywords/tags
    if (adData.keywords.length > 0) {
      params.set('tags', adData.keywords.join(','));
    }
    
    // Navigate to step 2 of the posting process where form is filled
    return `https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html?${params.toString()}`;
  };

  const handleDownloadImage = () => {
    try {
        const safeName = getSafeFilename(ad.title);
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${imageData}`;
        link.download = `${safeName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onShowMessage("Bild wurde heruntergeladen", "success");
    } catch(e) {
        onShowMessage("Fehler beim Bild-Download", "error");
    }
  };

  const handleDownloadPDF = () => {
    try {
        onShowMessage("PDF wird generiert...", "info");
        const doc = createPDFDoc();
        const safeName = getSafeFilename(ad.title);
        doc.save(`${safeName}.pdf`);
        onShowMessage("PDF erfolgreich erstellt", "success");
    } catch(e) {
        console.error(e);
        onShowMessage("Fehler bei der PDF-Erstellung", "error");
    }
  };

  const handleDownloadZip = async () => {
    try {
        onShowMessage("ZIP Paket wird erstellt...", "info");
        const zip = new JSZip();
        const safeName = getSafeFilename(ad.title);

        // 1. Add Image
        zip.file(`${safeName}.jpg`, imageData, {base64: true});

        // 2. Add Text Description
        zip.file(`${safeName}.txt`, getFormattedFullAd());

        // 3. Add PDF
        const doc = createPDFDoc();
        const pdfBlob = doc.output('blob');
        zip.file(`${safeName}.pdf`, pdfBlob);

        // Generate and Save
        const content = await zip.generateAsync({type: "blob"});
        saveFile(content, `${safeName}_Paket.zip`);
        onShowMessage("Download gestartet", "success");
    } catch(e) {
        console.error(e);
        onShowMessage("Fehler beim Erstellen des ZIP-Archivs", "error");
    }
  };

  const handleInputChange = (field: keyof AdData, value: string | number) => {
    setAd(prev => ({ ...prev, [field]: value }));
  };

  // Calculate price bar position
  const priceRange = ad.priceMax - ad.priceMin;
  const pricePosition = priceRange > 0 
    ? ((ad.suggestedPrice - ad.priceMin) / priceRange) * 100 
    : 50;
  const markerPosition = Math.min(Math.max(pricePosition, 0), 100);

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto w-full pb-20 animate-fade-in">
      
      {/* Left Column: Image & Analytics */}
      <div className="lg:w-1/3 space-y-6">
        <div className="bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-700 group relative overflow-hidden">
          <img 
            src={`data:image/png;base64,${imageData}`} 
            alt="Analyzed Item" 
            className="w-full h-48 md:h-64 object-contain rounded-lg transition-transform group-hover:scale-105 duration-500"
          />
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/10">
             Original
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700">
          <h3 className="text-lg font-bold text-white flex items-center mb-6">
            <Euro className="mr-2 text-green-400" size={24} /> Markt-Analyse
          </h3>
          
          <div className="relative pt-8 pb-8 px-2 mb-6 select-none">
             {/* Top Labels */}
             <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 absolute top-0 w-full px-1 tracking-wider">
               <span className="flex flex-col items-start">
                 <span>{ad.priceMin} €</span>
                 <span className="text-[9px] font-normal text-green-400">Schnell weg</span>
               </span>
               <span className="flex flex-col items-end">
                 <span>{ad.priceMax} €</span>
                 <span className="text-[9px] font-normal text-orange-400">Max. Gewinn</span>
               </span>
             </div>

             {/* Bar Track */}
             <div className="h-4 bg-slate-700 rounded-full relative shadow-inner mt-1 border border-slate-600">
                {/* Gradient segment */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-orange-500 opacity-90" />
                
                {/* Visual grid lines */}
                <div className="absolute inset-0 flex justify-between px-[25%] opacity-20">
                   <div className="w-px h-full bg-black"></div>
                   <div className="w-px h-full bg-black"></div>
                   <div className="w-px h-full bg-black"></div>
                </div>
             </div>

             {/* Marker */}
             <div 
               className="absolute top-5 w-8 -ml-4 transition-all duration-500 ease-out flex flex-col items-center z-10"
               style={{ left: `${markerPosition}%` }}
             >
                <div className="w-4 h-4 rounded-full bg-white border-[3px] border-slate-800 shadow-lg mb-1.5"></div>
                <div 
                  className="bg-slate-900 text-white border border-slate-600 text-xs font-bold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap transform transition-transform hover:scale-110"
                >
                  {ad.suggestedPrice} €
                </div>
             </div>
          </div>

          <div className="bg-blue-900/20 p-4 rounded-xl text-sm text-blue-200 border border-blue-900/50 mb-6 flex items-start gap-3">
            <Info className="flex-shrink-0 text-blue-400 mt-0.5" size={18} />
            <p className="opacity-90 leading-relaxed">{ad.reasoning}</p>
          </div>

          {sources.length > 0 && (
            <div className="border-t border-slate-700 pt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Gefundene Referenzen</p>
              <ul className="space-y-2.5">
                {sources.slice(0, 3).map((source, idx) => (
                  <li key={idx}>
                    <a 
                      href={source.uri} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center truncate transition-colors"
                    >
                      <ExternalLink size={12} className="mr-2 flex-shrink-0 opacity-50" />
                      <span className="truncate">{source.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button 
          onClick={onReset}
          className="w-full py-4 px-4 rounded-xl border border-slate-700 text-slate-400 font-semibold hover:bg-slate-800 hover:text-white hover:shadow-md transition-all flex items-center justify-center bg-slate-900"
        >
          <RefreshCw className="mr-2" size={18} /> Neues Objekt scannen
        </button>
      </div>

      {/* Right Column: Editor */}
      <div className="lg:w-2/3 flex flex-col gap-6">
        <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Inserat bearbeiten</h2>
            <div className="flex items-center gap-3">
                 <button
                   onClick={() => onSave(ad)}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                     isSaved
                       ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700 hover:bg-yellow-900/50' 
                       : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                   }`}
                   title={isSaved ? "Gespeichert" : "Artikel merken"}
                 >
                   <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
                   {isSaved ? 'Gespeichert' : 'Merken'}
                 </button>

                 <button
                   onClick={toggleSpeech}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                     isSpeaking 
                       ? 'bg-red-900/30 text-red-400 border-red-700 animate-pulse' 
                       : 'bg-blue-900/30 text-blue-400 border-blue-800 hover:bg-blue-900/50'
                   }`}
                   title="Anzeige vorlesen lassen"
                 >
                   {isSpeaking ? <StopCircle size={14} /> : <Volume2 size={14} />}
                   {isSpeaking ? 'Stop' : 'Vorlesen'}
                 </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Title */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                 <label className="text-sm font-semibold text-slate-300">Titel</label>
                 <span className={`text-xs ${ad.title.length > 60 ? 'text-red-400' : 'text-slate-500'}`}>{ad.title.length}/60</span>
              </div>
              <div className="flex gap-2 group">
                 <input 
                   type="text" 
                   value={ad.title}
                   onChange={(e) => handleInputChange('title', e.target.value)}
                   className="flex-1 p-3 rounded-xl border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-medium text-lg placeholder-slate-600"
                 />
                 <button 
                   onClick={() => copyToClipboard(ad.title, 'title')}
                   className={`px-4 rounded-xl border transition-all ${copiedField === 'title' ? 'bg-green-600 text-white border-green-600' : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-green-400 hover:border-green-800'}`}
                   title="Titel kopieren"
                 >
                   {copiedField === 'title' ? <Check size={20}/> : <Copy size={20}/>}
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Preis (€)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={ad.suggestedPrice}
                    onChange={(e) => handleInputChange('suggestedPrice', parseInt(e.target.value) || 0)}
                    className="flex-1 p-3 rounded-xl border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold"
                  />
                  <button 
                    onClick={() => copyToClipboard(ad.suggestedPrice.toString(), 'price')}
                    className={`px-3 rounded-xl border transition-all ${copiedField === 'price' ? 'bg-green-600 text-white border-green-600' : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-green-400'}`}
                  >
                    {copiedField === 'price' ? <Check size={18}/> : <Copy size={18}/>}
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Kategorie</label>
                <div className="relative">
                   <input 
                     type="text" 
                     value={ad.category}
                     readOnly
                     className="w-full p-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-400 cursor-not-allowed select-none"
                   />
                </div>
              </div>
            </div>

             {/* Condition */}
             <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Zustand</label>
                <div className="flex flex-wrap gap-2">
                   {['Neu', 'Sehr gut', 'Gut', 'In Ordnung', 'Defekt'].map((cond) => (
                     <button 
                      key={cond}
                      onClick={() => handleInputChange('condition', cond)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${ad.condition === cond ? 'bg-green-600 text-white shadow-md transform scale-105' : 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600'}`}
                     >
                       {cond}
                     </button>
                   ))}
                </div>
              </div>

            {/* Description */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-semibold text-slate-300">Beschreibung</label>
                <button 
                   onClick={() => copyToClipboard(ad.description, 'desc')}
                   className="text-xs font-medium text-green-500 hover:text-green-400 flex items-center hover:underline"
                >
                   {copiedField === 'desc' ? <><Check size={12} className="mr-1"/> Kopiert</> : 'Alles kopieren'}
                </button>
              </div>
              <textarea 
                rows={16}
                value={ad.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-600 bg-slate-900 focus:ring-2 focus:ring-green-500 outline-none transition-all font-sans text-slate-300 leading-relaxed resize-none placeholder-slate-600"
              />
            </div>

            {/* Tags */}
            <div>
               <label className="flex items-center text-sm font-semibold text-slate-300 mb-3">
                 <Tag size={16} className="mr-2 text-slate-500"/> Suchbegriffe
               </label>
               <div className="flex flex-wrap gap-2">
                 {ad.keywords.map((tag, idx) => (
                   <span key={idx} className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm border border-slate-600 font-medium hover:bg-green-900/30 hover:text-green-400 hover:border-green-800 transition-colors cursor-default">
                     #{tag}
                   </span>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Action / Posting Area */}
        <div className="flex flex-col gap-4">
            
            {/* Row 1: Downloads & Share */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
               <button 
                 onClick={handleDownloadPDF}
                 className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:text-white"
               >
                 <FileText size={20} />
                 <span className="text-xs font-medium">PDF</span>
               </button>

               <button 
                 onClick={handleDownloadImage}
                 className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:text-white"
               >
                 <ImageIcon size={20} />
                 <span className="text-xs font-medium">Bild</span>
               </button>
               
               <button 
                 onClick={handleDownloadZip}
                 className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:text-white"
               >
                 <Archive size={20} />
                 <span className="text-xs font-medium">Alles (ZIP)</span>
               </button>

               <button 
                 onClick={handleShare}
                 className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:text-white"
               >
                 <Share2 size={20} />
                 <span className="text-xs font-medium">Teilen</span>
               </button>
            </div>

            {/* Row 2: Main Action */}
            <button 
              onClick={handlePostClick}
              className="w-full bg-[#86d47d] hover:bg-[#7bc472] text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-3 transition-all transform active:scale-95 relative group overflow-hidden"
            >
              <div className="bg-white/20 p-2 rounded-full text-white group-hover:bg-white/30">
                 <ExternalLink size={20} />
              </div>
              <span className="text-left relative z-10">
                 <span className="block text-sm font-extrabold text-[#1a4a15]">Auf Kleinanzeigen</span>
                 <span className="block text-xs font-medium text-[#2d6627]">Inserieren & Öffnen</span>
              </span>
              
              {copiedField === 'auto-desc' && (
                 <div className="absolute inset-0 bg-[#6cb363] flex items-center justify-center animate-pulse z-20">
                    <span className="text-[#1a4a15] font-bold flex items-center gap-2">
                       <Check size={18}/> Beschreibung kopiert
                    </span>
                 </div>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};
