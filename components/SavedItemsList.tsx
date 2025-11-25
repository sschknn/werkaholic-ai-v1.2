import React from 'react';
import { SavedItem } from '../types';
import { Trash2, Calendar, ArrowRight, BookmarkX } from 'lucide-react';

interface SavedItemsListProps {
  items: SavedItem[];
  onSelect: (item: SavedItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClose: () => void;
}

export const SavedItemsList: React.FC<SavedItemsListProps> = ({ items, onSelect, onDelete, onClose }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-fade-in">
        <div className="bg-slate-800 p-6 rounded-full mb-6 border border-slate-700">
          <BookmarkX size={48} className="text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Keine gespeicherten Artikel</h3>
        <p className="text-slate-400 max-w-xs mx-auto mb-8">
          Du hast noch keine Artikel gespeichert. Scanne etwas und klicke auf das Lesezeichen-Symbol.
        </p>
        <button 
          onClick={onClose}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-green-900/20 hover:bg-green-500 transition-all"
        >
          Jetzt scannen
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Gespeicherte Artikel ({items.length})</h2>
        <button 
          onClick={onClose}
          className="text-sm font-medium text-green-400 hover:text-green-300 hover:underline"
        >
          Zurück zum Scan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div 
            key={item.id}
            onClick={() => onSelect(item)}
            className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden hover:shadow-lg hover:border-slate-600 transition-all cursor-pointer group flex flex-col h-full"
          >
            <div className="relative h-48 bg-slate-900 overflow-hidden">
              <img 
                src={`data:image/jpeg;base64,${item.imageData}`} 
                alt={item.adData.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm text-white border border-white/10">
                {item.adData.suggestedPrice} €
              </div>
            </div>

            <div className="p-5 flex-grow flex flex-col">
              <h3 className="font-bold text-white mb-2 line-clamp-2 min-h-[3rem]">
                {item.adData.title}
              </h3>
              
              <div className="flex items-center text-xs text-slate-400 mb-4">
                <Calendar size={12} className="mr-1.5" />
                {new Date(item.timestamp).toLocaleDateString('de-DE')} • {new Date(item.timestamp).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-700">
                <span className="text-sm font-medium text-blue-400 group-hover:underline flex items-center">
                  Öffnen <ArrowRight size={14} className="ml-1" />
                </span>
                <button
                  onClick={(e) => onDelete(item.id, e)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-full transition-colors"
                  title="Löschen"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};