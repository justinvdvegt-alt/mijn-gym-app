
import React, { useState } from 'react';
import { HealthStats } from '../types';

interface Props {
  onAdd: (stats: HealthStats) => void;
  latest?: HealthStats;
}

const GOALS = [
  "Spieropbouw (Bulk)",
  "Vetverlies (Cut)",
  "Conditie Verbeteren",
  "Gezond Gewicht Behouden",
  "Kracht Vergroten"
];

export const HealthModule: React.FC<Props> = ({ onAdd, latest }) => {
  const [sleep, setSleep] = useState(latest?.sleep?.toString() || '');
  const [cal, setCal] = useState(latest?.calories?.toString() || '');
  const [prot, setProt] = useState(latest?.protein?.toString() || '');
  const [weight, setWeight] = useState(latest?.weight?.toString() || '');
  const [height, setHeight] = useState(latest?.height?.toString() || '');
  const [age, setAge] = useState(latest?.age?.toString() || '');
  const [goal, setGoal] = useState(latest?.goal || GOALS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      date: new Date().toISOString(),
      sleep: parseFloat(sleep) || 0,
      calories: parseInt(cal) || 0,
      protein: parseInt(prot) || 0,
      weight: parseFloat(weight) || 0,
      height: parseFloat(height) || 0,
      age: parseInt(age) || 0,
      goal: goal
    });
    alert("Biometrie succesvol bijgewerkt!");
  };

  const InputField = ({ label, value, onChange, placeholder, icon, type = "number", step = "0.1" }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-brand-200">
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

  return (
    <div className="p-6 space-y-8 pb-24">
      <header>
        <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Bio Metrics & Doelen</h2>
        <p className="text-sm text-slate-500 font-medium">Je profiel helpt de AI een plan op maat te maken.</p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-3 block">Mijn Fitness Doel</label>
          <select 
            value={goal} 
            onChange={(e) => setGoal(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
          >
            {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <InputField label="Lengte (cm)" value={height} onChange={setHeight} placeholder="0" icon="📏" step="1" />
            <InputField label="Leeftijd" value={age} onChange={setAge} placeholder="0" icon="🎂" step="1" />
            <InputField label="Gewicht (kg)" value={weight} onChange={setWeight} placeholder="0.0" icon="⚖️" />
            <InputField label="Slaap (u)" value={sleep} onChange={setSleep} placeholder="0.0" icon="🌙" />
            <InputField label="Kcal Doel" value={cal} onChange={setCal} placeholder="0" icon="🔥" step="1" />
            <InputField label="Eiwit (g)" value={prot} onChange={setProt} placeholder="0" icon="🍗" step="1" />
        </div>
        
        <button type="submit" className="w-full bg-brand-600 text-white font-bold p-5 text-lg rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-700 active:scale-[0.98] transition-all">
          Sla Profiel & Stats Op
        </button>
      </form>

      <div className="bg-brand-50 border border-brand-100 p-5 rounded-2xl">
        <div className="flex gap-3">
            <span className="text-brand-500 text-xl">💡</span>
            <p className="text-xs text-brand-900/70 font-medium leading-relaxed">
                Hoe nauwkeuriger je biometrie, hoe beter de AI Coach je kan adviseren over herstel en progressie.
            </p>
        </div>
      </div>
    </div>
  );
};
