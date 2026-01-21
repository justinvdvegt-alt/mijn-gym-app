
import React, { useState } from 'react';
import { CardioEntry } from '../types';
import { connectStrava, getLatestActivities } from '../services/strava';

interface Props {
  history: CardioEntry[];
  onAdd: (entry: CardioEntry) => void;
  stravaLinked: boolean;
  onLinkStrava: () => void;
}

export const CardioModule: React.FC<Props> = ({ history, onAdd, stravaLinked, onLinkStrava }) => {
  const [dist, setDist] = useState('');
  const [dur, setDur] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dist || !dur) return;
    onAdd({
      id: crypto.randomUUID(),
      type: 'run',
      distance: parseFloat(dist),
      duration: parseInt(dur),
      date: new Date().toISOString(),
      source: 'manual'
    });
    setDist('');
    setDur('');
  };

  const handleSync = async () => {
    if (!stravaLinked) {
      connectStrava();
      return;
    }
    
    setSyncing(true);
    try {
      const stravaActivities = await getLatestActivities();
      stravaActivities.forEach(activity => {
        // Only add if not already in history
        if (!history.find(h => h.id === activity.id)) {
          onAdd(activity as CardioEntry);
        }
      });
    } catch (err) {
      console.error("Sync error", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <header>
        <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Cardio & Connecties</h2>
        <p className="text-sm text-slate-500 font-medium">Beheer je runs en sync met Strava.</p>
      </header>
      
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center justify-between transition-all hover:border-brand-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#FC4C02] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
          </div>
          <div>
            <div className="font-bold text-slate-900">Strava</div>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${stravaLinked ? 'text-brand-500' : 'text-slate-400'}`}>
              {stravaLinked ? 'Account Gekoppeld' : 'Niet Verbonden'}
            </div>
          </div>
        </div>
        <button 
          onClick={handleSync}
          disabled={syncing}
          className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
            stravaLinked 
              ? 'bg-slate-900 text-white hover:bg-black active:scale-95' 
              : 'bg-[#FC4C02] text-white hover:bg-[#e34402] active:scale-95 shadow-lg shadow-orange-100'
          }`}
        >
          {syncing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : null}
          {stravaLinked ? 'Sync Nu' : 'Koppel Strava'}
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-background px-4 text-slate-400">Handmatige Invoer</span></div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <label className="block text-slate-400 text-[11px] font-bold mb-2 uppercase tracking-wider">Afstand (km)</label>
            <input 
              type="number" 
              step="0.01"
              value={dist} 
              onChange={(e) => setDist(e.target.value)}
              className="w-full bg-slate-50 border-none p-4 text-3xl font-bold text-center outline-none rounded-2xl text-slate-900 focus:ring-4 focus:ring-brand-50 transition-all"
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>
          <div className="text-center">
            <label className="block text-slate-400 text-[11px] font-bold mb-2 uppercase tracking-wider">Tijd (min)</label>
            <input 
              type="number" 
              value={dur} 
              onChange={(e) => setDur(e.target.value)}
              className="w-full bg-slate-50 border-none p-4 text-3xl font-bold text-center outline-none rounded-2xl text-slate-900 focus:ring-4 focus:ring-brand-50 transition-all"
              placeholder="0"
              inputMode="numeric"
            />
          </div>
        </div>
        <button className="w-full bg-slate-900 text-white font-bold p-5 text-lg rounded-2xl shadow-xl hover:bg-black active:scale-[0.98] transition-all">
          Sessie Opslaan
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Recente Activiteiten</h3>
        <div className="space-y-3">
            {history.slice(0, 10).map(entry => (
              <div key={entry.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.source === 'strava' ? 'bg-orange-50 text-orange-500' : 'bg-brand-50 text-brand-500'}`}>
                    {entry.source === 'strava' ? (
                       <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                    ) : (
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{entry.distance} km</div>
                    <div className="text-[11px] text-slate-400 font-medium">{entry.duration} min • {new Date(entry.date).toLocaleDateString('nl-NL')}</div>
                  </div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {((entry.distance / (entry.duration / 60)) || 0).toFixed(1)} <span className="text-[9px] font-normal text-slate-400 uppercase">km/u</span>
                    </div>
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-center text-slate-400 py-10 italic text-sm">Nog geen cardio sessies gelogd.</p>}
        </div>
      </div>
    </div>
  );
};
