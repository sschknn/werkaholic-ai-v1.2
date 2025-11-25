
import React, { useMemo } from 'react';
import { SavedItem } from '../types';
import { TrendingUp, DollarSign, Package, PieChart, ArrowRight } from 'lucide-react';

interface MarketViewProps {
  items: SavedItem[];
  onNavigateToScanner: () => void;
}

export const MarketView: React.FC<MarketViewProps> = ({ items, onNavigateToScanner }) => {
  
  const stats = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + item.adData.suggestedPrice, 0);
    const avgPrice = items.length > 0 ? totalValue / items.length : 0;
    
    // Calculate categories
    const categories: Record<string, number> = {};
    items.forEach(item => {
      const cat = item.adData.category || 'Sonstiges';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    // Sort categories by count
    const sortedCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5

    return { totalValue, avgPrice, sortedCategories, itemCount: items.length };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 flex flex-col items-center justify-center h-[60vh] animate-fade-in">
         <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-lg border border-slate-700">
            <PieChart size={40} className="text-slate-500" />
         </div>
         <h2 className="text-2xl font-bold text-white mb-2">Noch keine Daten</h2>
         <p className="text-slate-400 text-center max-w-md mb-8">
           Scanne und speichere Artikel, um hier eine Übersicht über deinen potenziellen Umsatz und dein Inventar zu erhalten.
         </p>
         <button 
           onClick={onNavigateToScanner}
           className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/20"
         >
           Ersten Artikel scannen
         </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Markt & Inventar</h2>
        <p className="text-slate-400">Statistiken zu deinen {items.length} gespeicherten Artikeln.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
           <div className="flex items-center gap-3 mb-2 text-green-400">
              <DollarSign size={24} />
              <span className="font-bold text-sm uppercase tracking-wider">Gesamtwert</span>
           </div>
           <div className="text-4xl font-extrabold text-white">
             {stats.totalValue.toLocaleString('de-DE')} €
           </div>
           <p className="text-slate-500 text-xs mt-2">Potenzieller Umsatz</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
           <div className="flex items-center gap-3 mb-2 text-blue-400">
              <TrendingUp size={24} />
              <span className="font-bold text-sm uppercase tracking-wider">Durchschnitt</span>
           </div>
           <div className="text-4xl font-extrabold text-white">
             {stats.avgPrice.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
           </div>
           <p className="text-slate-500 text-xs mt-2">Preis pro Artikel</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
           <div className="flex items-center gap-3 mb-2 text-purple-400">
              <Package size={24} />
              <span className="font-bold text-sm uppercase tracking-wider">Inventar</span>
           </div>
           <div className="text-4xl font-extrabold text-white">
             {stats.itemCount}
           </div>
           <p className="text-slate-500 text-xs mt-2">Gespeicherte Inserate</p>
        </div>
      </div>

      {/* Category Chart */}
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-lg">
         <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <PieChart size={20} className="text-slate-400"/> Top Kategorien
         </h3>
         
         <div className="space-y-5">
            {stats.sortedCategories.map(([cat, count], index) => {
               const percentage = (count / items.length) * 100;
               return (
                  <div key={index}>
                     <div className="flex justify-between text-sm font-medium mb-1">
                        <span className="text-white">{cat}</span>
                        <span className="text-slate-400">{count} Artikel ({Math.round(percentage)}%)</span>
                     </div>
                     <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
                        <div 
                           className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000 ease-out"
                           style={{ width: `${percentage}%` }}
                        />
                     </div>
                  </div>
               );
            })}
         </div>

         <div className="mt-8 pt-6 border-t border-slate-700 text-center">
             <button 
               onClick={onNavigateToScanner}
               className="text-slate-400 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors mx-auto"
             >
               Weiteres Inventar hinzufügen <ArrowRight size={16} />
             </button>
         </div>
      </div>
    </div>
  );
};
