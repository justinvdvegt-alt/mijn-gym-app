
import React, { useState } from 'react';
import { CardioEntry } from '../types';
import { connectStrava, getLatestActivities } from '../services/strava';

interface Props {
  history: CardioEntry[];
  onAdd: (entry: CardioEntry) => void;
  onDelete: (id: string) => void;
  stravaLinked: boolean;
  onLinkStrava: () => void;
}

export const CardioModule: React.FC<Props> = ({ history, onAdd, onDelete, stravaLinked, onLinkStrava }) => {
  const [dist, setDist] = useState('');
  const [dur, setDur] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dist || !dur) return;
    onAdd({ id: crypto.randomUUID(), type: 'run', distance: parseFloat(dist), duration: parseInt(dur), date: new Date().toISOString(), source: 'manual' });
    setDist(''); setDur('');
  };

  const handleSync = async () => {
    if (!stravaLinked) { connectStrava(); return; }
    setSyncing(true);
    try {
      const stravaActivities = await getLatestActivities();
      stravaActivities.forEach(activity => {
        if (!history.find(h => h.id === activity.id)) onAdd(activity as CardioEntry);
      });
    } catch (err) { console.error(err); }
    finally { setSyncing(false); }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <header><h2 className="text-2xl font-bold text-slate-900">Cardio</h2></header>
      <div className="bg-white border p-5 rounded-3xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FC4C02] rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg></div>
          <div><div className="font-bold">Strava</div><div className={`text-[10px] font-bold ${stravaLinked ? 'text-brand-500' : 'text-slate-400'}`}>{stravaLinked ? 'Verbonden' : 'Ontkoppeld'}</div></div>
        </div>
        <button onClick={handleSync} disabled={syncing} className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all">{syncing ? '...' : 'Sync'}</button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center"><label className="block text-[10px] font-bold text-slate-400 mb-1">KM</label><input type="number" step="0.1" value={dist} onChange={(e) => setDist(e.target.value)} className="w-full bg-slate-50 p-4 text-2xl font-bold text-center rounded-xl outline-none" placeholder="0.0" /></div>
          <div className="text-center"><label className="block text-[10px] font-bold text-slate-400 mb-1">MIN</label><input type="number" value={dur} onChange={(e) => setDur(e.target.value)} className="w-full bg-slate-50 p-4 text-2xl font-bold text-center rounded-xl outline-none" placeholder="0" /></div>
        </div>
        <button className="w-full bg-brand-600 text-white font-bold p-5 rounded-2xl active:scale-95">Sessie Opslaan</button>
      </form>

      <div className="space-y-3">
        {history.map(entry => (
          <div key={entry.id} className="bg-white border p-4 rounded-2xl flex justify-between items-center group">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.source === 'strava' ? 'bg-orange-50 text-orange-500' : 'bg-brand-50 text-brand-500'}`}>{entry.source === 'strava' ? 'S' : 'M'}</div>
              <div><div className="font-bold">{entry.distance} km</div><div className="text-[10px] text-slate-400">{entry.duration} min • {new Date(entry.date).toLocaleDateString()}</div></div>
            </div>
            <button onClick={() => onDelete(entry.id)} className="text-slate-300 hover:text-red-400 p-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          </div>
        ))}
      </div>
    </div>
  );
};
