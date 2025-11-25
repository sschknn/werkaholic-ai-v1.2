
import React, { useState, useRef, useEffect } from 'react';
import { Question } from '../types';
import { MessageCircleQuestion, Send, SkipForward, CornerDownLeft } from 'lucide-react';

interface QuestionModalProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  onSkip: () => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({ questions, onSubmit, onSkip }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Reset refs when questions change
    inputRefs.current = inputRefs.current.slice(0, questions.length);
  }, [questions]);

  const handleChange = (questionText: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionText]: value
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < questions.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleSubmit(e as any);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start gap-4 bg-slate-900/50">
          <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-400 border border-indigo-500/20 shrink-0 shadow-lg shadow-indigo-900/10">
             <MessageCircleQuestion size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight mb-1">Rückfragen zum Artikel</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Die KI benötigt noch ein paar Details für ein perfektes Inserat.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="questions-form" onSubmit={handleSubmit} className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="animate-fade-in-up group" style={{ animationDelay: `${idx * 100}ms` }}>
                <label className="block text-sm font-semibold text-slate-300 mb-3 flex gap-2">
                  <span className="bg-slate-800 text-slate-500 w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 border border-slate-700 font-mono">
                    {idx + 1}
                  </span>
                  <span className="group-focus-within:text-indigo-400 transition-colors pt-0.5">
                    {q.text}
                  </span>
                </label>
                <div className="relative group/input">
                  <input
                    ref={el => { inputRefs.current[idx] = el }}
                    type="text"
                    placeholder="Antwort eingeben..."
                    value={answers[q.text] || ''}
                    onChange={(e) => handleChange(q.text, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 pl-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-600 shadow-inner"
                    autoFocus={idx === 0}
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none transition-colors group-focus-within/input:text-indigo-500 opacity-0 group-focus-within/input:opacity-100">
                      {idx === questions.length - 1 ? <CornerDownLeft size={16} /> : null}
                  </div>
                </div>
              </div>
            ))}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center gap-4 mt-auto">
          <button
            type="button"
            onClick={onSkip}
            className="text-slate-500 hover:text-slate-300 px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-lg hover:bg-slate-800"
          >
            <SkipForward size={16} /> 
            <span>Überspringen</span>
          </button>
          
          <button
            type="submit"
            form="questions-form"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition-all transform active:scale-95 border border-indigo-500"
          >
            <span>Weiter zur Analyse</span>
            <Send size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};
