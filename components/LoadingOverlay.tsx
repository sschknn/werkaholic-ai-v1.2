
import React, { useEffect, useState } from 'react';
import { Scan, Search, PenTool, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';

const steps = [
  { icon: Scan, text: "Bildanalyse läuft..." },
  { icon: Search, text: "Recherchen Marktpreise..." },
  { icon: PenTool, text: "Erstelle Beschreibung..." },
  { icon: Sparkles, text: "Finalisiere Anzeige..." },
];

interface LoadingOverlayProps {
    message?: string | null;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Determine if it's a retry/warning message
  const isRetry = message?.toLowerCase().includes("versuch") || message?.toLowerCase().includes("ausgelastet");
  
  const StepIcon = message ? (isRetry ? AlertTriangle : RefreshCw) : steps[currentStep].icon;
  const displayText = message || steps[currentStep].text;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-24 h-24 mb-8">
        <div className={`absolute inset-0 border-4 ${isRetry ? 'border-t-orange-500' : (message ? 'border-t-yellow-500' : 'border-t-green-500')} border-slate-700 rounded-full animate-spin`}></div>
        <div className={`absolute inset-0 flex items-center justify-center ${isRetry ? 'text-orange-500' : (message ? 'text-yellow-500' : 'text-green-500')}`}>
          <StepIcon size={40} className={message ? (isRetry ? "animate-pulse" : "animate-spin") : "animate-pulse"} style={{ animationDuration: message && !isRetry ? '2s' : '' }} />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2 text-center">
        {isRetry ? "Einen Moment..." : (message ? "Warte..." : "KI arbeitet")}
      </h2>
      <p className={`text-lg animate-bounce text-center max-w-md leading-relaxed ${isRetry ? 'text-orange-400 font-medium' : 'text-slate-400'}`}>
        {displayText}
      </p>

      {!message && (
          <div className="mt-8 flex gap-2">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 w-2 rounded-full transition-colors duration-300 ${idx === currentStep ? 'bg-green-500 scale-125' : 'bg-slate-700'}`}
              />
            ))}
          </div>
      )}
    </div>
  );
};
