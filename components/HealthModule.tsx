
import React, { useState, useMemo, useEffect } from 'react';
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

// InputField BUITEN de component om focus-verlies te voorkomen
const InputField = ({ label, value, onChange, placeholder, icon, type = "number", step = "0.1" }: any) => (
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

export const HealthModule: React.FC<Props> = ({ onAdd, latest }) => {
  const [sleep, setSleep] = useState(latest?.sleep?.toString() || '');
  const [cal, setCal] = useState(latest?.calories?.toString() || '');
  const [prot, setProt] = useState(latest?.protein?.toString() || '');
  const [weight, setWeight] = useState(latest?.weight?.toString() || '');
  const [height, setHeight] = useState(latest?.height?.toString() || '');
  const [age, setAge] = useState(latest?.age?.toString() || '');
  const [goal, setGoal] = useState(latest?.goal || GOALS[0]);
  const [saved, setSaved] = useState(false);

  // Synchroniseer met opgeslagen data bij mount of verandering
  useEffect(() => {
    if (latest) {
      setSleep(latest.sleep?.toString() || '');
      setCal(latest.calories?.toString() || '');
      setProt(latest.protein?.toString() || '');
      setWeight(latest.weight?.toString() || '');
      setHeight(latest.height?.toString() || '');
      setAge(latest.age?.toString() || '');
      setGoal(latest.goal || GOALS[0]);
    }
  }, [latest]);

  const bmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w > 0 && h > 0) return (w / (h * h)).toFixed(1);
    return null;
  }, [weight, height]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    const val = parseFloat(bmi);
    if (val < 18.5) return { label: 'Ondergewicht', color: 'text-orange-500' };
    if (val < 25) return { label: 'Gezond Gewicht', color: 'text-green-500' };
    if (val < 30) return { label: 'Overgewicht', color: 'text-orange-500' };
    return { label: 'Obesitas', color: 'text-red-500' };
  }, [bmi]);

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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-8 pb-24 animate-slide-up">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bio Metrics</h2>
          <p className="text-sm text-slate-500 font-medium">Data blijft bewaard na refresh.</p>
        </div>
        {saved && (
          <div className="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full animate-bounce">
            OPGESLAGEN!
          </div>
        )}
      </header>
      
      {bmi && (
        <div className="bg-slate-900 p-6 rounded-[32px] text-white flex justify-between items-center shadow-xl">
          <div>
            <div className="text-[10px] font-black uppercase opacity-60 tracking-widest">Jouw BMI</div>
            <div className="text-4xl font-black">{bmi}</div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-bold uppercase tracking-widest ${bmiCategory?.color}`}>
              {bmiCategory?.label}
            </div>
            <div className="text-[10px] opacity-40 mt-1 max-w-[100px] leading-tight text-white/60">Op basis van je huidige stats.</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-3 block">Mijn Doel</label>
          <select 
            value={goal} 
            onChange={(e) => setGoal(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-brand-500"
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
        
        <button 
          type="submit" 
          className="w-full bg-brand-600 text-white font-bold p-5 text-lg rounded-2xl shadow-lg shadow-brand-100 active:scale-95 transition-all hover:bg-brand-700 mt-4"
        >
          Gegevens Bevestigen
        </button>
      </form>
    </div>
  );
};
