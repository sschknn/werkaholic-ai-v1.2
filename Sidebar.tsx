
import React from 'react';
import { Camera, Bookmark, HelpCircle, BarChart3, Settings, Radio } from 'lucide-react';
import { AppState } from '../types';
import { AppIcon } from './AppIcon';

interface SidebarProps {
  activeState: AppState;
  onChangeState: (state: AppState) => void;
  savedCount: number;
  onShowMessage: (msg: string, type?: 'info' | 'success' | 'error') => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeState, onChangeState, savedCount, onShowMessage, onOpenSettings }) => {
  
  const navItems = [
    { id: AppState.IDLE, label: 'Foto Scanner', icon: Camera },
    { id: AppState.LIVESCAN, label: 'Live Scanner', icon: Radio },
    { id: AppState.BOOKMARKS, label: 'Gespeicherte Artikel', icon: Bookmark, badge: savedCount },
    { id: AppState.MARKET, label: 'Markt Übersicht', icon: BarChart3 },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-slate-900 border-r border-slate-800 h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onChangeState(AppState.IDLE)}>
          <div className="transform transition-transform group-hover:scale-105 duration-300 shadow-lg shadow-green-900/20 rounded-2xl">
            <AppIcon size={48} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none mb-1">Genius AI</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Kleinanzeigen</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="mb-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Hauptmenü
        </div>
        
        {navItems.map((item) => {
          // Keep active if we are in sub-states like analyzing/editing but originated from IDLE/LIVESCAN context
          // Simplified: Highlight matches exact ID, or if IDLE is active during workflow
          const isActive = activeState === item.id || (item.id === AppState.IDLE && (activeState === AppState.ANALYZING || activeState === AppState.EDITING || activeState === AppState.ERROR));
          
          return (
            <button
              key={item.id}
              onClick={() => onChangeState(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={isActive ? (item.id === AppState.LIVESCAN ? 'text-red-500' : 'text-green-500') : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {item.id === AppState.LIVESCAN && (
                 <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                 </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-4">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
               AI
             </div>
             <div className="text-xs">
               <p className="text-white font-semibold">OpenRouter</p>
               <p className="text-slate-500">Free Tier</p>
             </div>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
             <div className="bg-indigo-500 w-full h-full rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center justify-between text-slate-500 px-2">
           <button 
             onClick={onOpenSettings}
             className="hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
             title="API Key Einstellungen"
           >
             <Settings size={16}/> Settings
           </button>
           <button 
             onClick={() => onShowMessage("Hilfe-Center in Kürze verfügbar.", "info")}
             className="hover:text-white transition-colors"
             title="Hilfe"
           >
             <HelpCircle size={18}/>
           </button>
        </div>
      </div>
    </aside>
  );
};