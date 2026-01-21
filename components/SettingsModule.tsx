
import React, { useState } from 'react';
import { HealthStats } from '../types';

interface Props {
  onSave: (stats: HealthStats) => void;
  latest?: HealthStats;
  onClose: () => void;
}

const InputField = ({ label, value, onChange, placeholder, icon, type = "number", step = "1" }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-50">
    <div className="flex items-center gap-2 mb-3">
        <span className="text-lg opacity-50">{icon}</span>
        <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">{label}</label>
    </div>
    <input 
      type={type} 
      step={step}
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      className="w-full bg-transparent text-3xl font-bold outline-none text-slate-900 placeholder-slate-200"
    />
  </div>
);

export const SettingsModule: React.FC<Props> = ({ onSave, latest, onClose }) => {
  const [cal, setCal] = useState(latest?.calories?.toString() || '2500');
  const [prot, setProt] = useState(latest?.protein?.toString() || '180');
  const [carbs, setCarbs] = useState(latest?.carbs_goal?.toString() || '250');
  const [fats, setFats] = useState(latest?.fats_goal?.toString() || '70');
  const [weight, setWeight] = useState(latest?.weight?.toString() || '75');
  const [height, setHeight] = useState(latest?.height?.toString() || '180');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: new Date().toISOString(),
      sleep: latest?.sleep || 8,
      calories: parseInt(cal) || 0,
      protein: parseInt(prot) || 0,
      carbs_goal: parseInt(carbs) || 0,
      fats_goal: parseInt(fats) || 0,
      weight: parseFloat(weight) || 0,
      height: parseFloat(height) || 0,
      age: latest?.age || 25,
      goal: latest?.goal || 'Conditie Verbeteren'
    });
    setSaved(true);
    setTimeout(() => {
        setSaved(false);
        onClose();
    }, 1000);
  };

  return (
    <div className="p-6 space-y-8 pb-32 animate-slide-up bg-white min-h-screen">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Profiel & Doelen</h2>
          <p className="text-sm text-slate-500 font-medium">Beheer je dagelijkse behoeften.</p>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </header>

      {saved && (
        <div className="bg-green-100 text-green-700 p-4 rounded-2xl text-center font-bold animate-pulse">
          DOELEN OPGESLAGEN!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Dagelijkse Doelen</h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Kcal Doel" value={cal} onChange={setCal} placeholder="2500" icon="🔥" />
            <InputField label="Eiwit (g)" value={prot} onChange={setProt} placeholder="180" icon="🥩" />
            <InputField label="Koolhydraten (g)" value={carbs} onChange={setCarbs} placeholder="250" icon="🍞" />
            <InputField label="Vetten (g)" value={fats} onChange={setFats} placeholder="70" icon="🥑" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Lichaamsstatistieken</h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Gewicht (kg)" value={weight} onChange={setWeight} placeholder="75.0" icon="⚖️" step="0.1" />
            <InputField label="Lengte (cm)" value={height} onChange={setHeight} placeholder="180" icon="📏" />
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-brand-600 text-white font-black p-5 rounded-3xl shadow-xl shadow-brand-100 active:scale-95 transition-all text-sm uppercase tracking-widest"
        >
          Instellingen Opslaan
        </button>
      </form>
    </div>
  );
};
