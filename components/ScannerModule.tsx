
import React, { useState, useRef, useMemo } from 'react';
import { MealEntry } from '../types';
import { analyzeMealImage } from '../services/gemini';
import { getDailyMeals } from '../storage';

interface Props {
  onAdd: (meal: MealEntry) => void;
  onDelete: (id: string) => void;
  dailyTotal: { cal: number, prot: number, carbs: number, fats: number };
  mealHistory: MealEntry[];
  goalCal?: number;
}

interface AIResult {
  naam: string;
  type: 'g' | 'ml';
  kcal_100: number;
  eiwit_100: number;
  koolhydraten_100: number;
  vet_100: number;
}

export const ScannerModule: React.FC<Props> = ({ onAdd, onDelete, dailyTotal, mealHistory, goalCal = 2500 }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State voor de dynamische calculator
  const [baseValues, setBaseValues] = useState<AIResult | null>(null);
  const [amount, setAmount] = useState<number>(100);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const todayMeals = getDailyMeals(mealHistory);

  // Live berekening van de totalen
  const calculated = useMemo(() => {
    if (!baseValues) return null;
    const factor = amount / 100;
    return {
      name: baseValues.naam,
      calories: Math.round(baseValues.kcal_100 * factor),
      protein: Number((baseValues.eiwit_100 * factor).toFixed(1)),
      carbs: Number((baseValues.koolhydraten_100 * factor).toFixed(1)),
      fats: Number((baseValues.vet_100 * factor).toFixed(1))
    };
  }, [baseValues, amount]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1024;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; } }
        else { if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBaseValues(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;
      setPreview(originalBase64);
      setLoading(true);
      try {
        const compressedBase64 = await compressImage(originalBase64);
        const data = await analyzeMealImage(compressedBase64);
        setBaseValues(data);
        setAmount(100); // Reset naar standaard 100g/ml
      } catch (err: any) { 
        setError(err.message); 
      } finally { 
        setLoading(false); 
      }
    };
    reader.readAsDataURL(file);
  };

  const updateBase = (key: keyof AIResult, value: string | number) => {
    if (!baseValues) return;
    setBaseValues({ ...baseValues, [key]: value });
  };

  const handleFinalSave = () => {
    if (!calculated) return;
    onAdd({
      id: crypto.randomUUID(),
      name: calculated.name || 'Gescand Product',
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fats: calculated.fats,
      fiber: 0,
      date: new Date().toISOString()
    });
    setPreview(null);
    setBaseValues(null);
  };

  return (
    <div className="p-6 space-y-8 pb-32 animate-slide-up">
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Food Scanner</h2>
        <p className="text-sm text-slate-500 font-medium">Extraheer voedingswaarden live uit foto's.</p>
      </header>

      {/* Progress Dashboard */}
      <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl grid grid-cols-4 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">Kcal / Doel</div>
          <div className="text-lg font-black">{dailyTotal.cal} <span className="text-[10px] opacity-40">/ {goalCal}</span></div>
        </div>
        <StatItem label="🥩 Eiwit" val={`${dailyTotal.prot}g`} />
        <StatItem label="🍞 Koolh" val={`${dailyTotal.carbs}g`} />
        <StatItem label="🥑 Vet" val={`${dailyTotal.fats}g`} />
      </div>

      {!preview ? (
        <div className="space-y-8">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full aspect-video bg-white border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-brand-500 hover:bg-slate-50 active:scale-95 transition-all group shadow-sm"
          >
            <div className="text-6xl group-hover:scale-110 transition-transform">📸</div>
            <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Maak een foto</span>
          </button>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Vandaag gegeten</h3>
            <div className="space-y-3">
              {todayMeals.map(m => (
                <div key={m.id} className="bg-white p-5 rounded-3xl border border-slate-50 flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-black text-slate-800 text-sm">{m.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      {m.calories} kcal • {m.protein}g 🥩 • {m.carbs}g 🍞 • {m.fats}g 🥑
                    </div>
                  </div>
                  <button onClick={() => onDelete(m.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
              {todayMeals.length === 0 && (
                <div className="text-center py-12 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-100">
                  <p className="text-slate-300 text-sm font-bold italic">Nog geen logs...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl animate-slide-up relative">
          <div className="relative aspect-video w-full">
            <img src={preview} alt="Scan preview" className="w-full h-full object-cover" />
            {loading && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 text-white p-8 text-center">
                <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_#0ea5e9]"></div>
                <div className="space-y-2">
                  <p className="font-black text-xl uppercase tracking-widest animate-pulse">AI Leest Etiketten...</p>
                  <p className="text-xs font-bold text-slate-400">Gezondheidswaarden worden geëxtraheerd per 100g/ml.</p>
                </div>
              </div>
            )}
          </div>

          {baseValues && !loading && (
            <div className="p-8 space-y-8">
              {/* Product Info Section */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Product / Merk</label>
                  <input 
                    type="text" 
                    value={baseValues.naam} 
                    onChange={(e) => updateBase('naam', e.target.value)}
                    className="w-full bg-transparent text-xl font-black text-slate-900 outline-none"
                  />
                </div>

                {/* Dynamische Calculator Slider */}
                <div className="bg-brand-50 p-6 rounded-[32px] border border-brand-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Hoeveelheid</span>
                    <span className="text-xl font-black text-brand-700">{amount}{baseValues.type}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="1000" 
                    step="1"
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500 mb-4"
                  />
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-white p-4 rounded-2xl text-center text-2xl font-black text-slate-900 border-2 border-transparent focus:border-brand-500 outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Live Calculated Totals */}
              <div className="grid grid-cols-2 gap-4">
                <TotalDisplay label="Totaal Kcal" val={calculated?.calories || 0} icon="🔥" active />
                <TotalDisplay label="Eiwit" val={`${calculated?.protein}g`} icon="🥩" />
                <TotalDisplay label="Koolh" val={`${calculated?.carbs}g`} icon="🍞" />
                <TotalDisplay label="Vet" val={`${calculated?.fats}g`} icon="🥑" />
              </div>

              {/* Editable Base Values (per 100) */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Waarden aanpassen (per 100{baseValues.type})</h4>
                <div className="grid grid-cols-2 gap-3">
                  <BaseInput label="Kcal" val={baseValues.kcal_100} onChange={(v) => updateBase('kcal_100', v)} />
                  <BaseInput label="Eiwit" val={baseValues.eiwit_100} onChange={(v) => updateBase('eiwit_100', v)} />
                  <BaseInput label="Koolh" val={baseValues.koolhydraten_100} onChange={(v) => updateBase('koolhydraten_100', v)} />
                  <BaseInput label="Vet" val={baseValues.vet_100} onChange={(v) => updateBase('vet_100', v)} />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setPreview(null); setBaseValues(null); }} 
                  className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-3xl active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Annuleer
                </button>
                <button 
                  onClick={handleFinalSave} 
                  className="flex-[2] bg-brand-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-brand-100 active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Toevoegen aan Logboek
                </button>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-10 text-center space-y-6">
              <div className="text-5xl">⚠️</div>
              <p className="text-red-500 font-black text-sm">{error}</p>
              <button 
                onClick={() => { setPreview(null); setError(null); }} 
                className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl"
              >
                Opnieuw Proberen
              </button>
            </div>
          )}
        </div>
      )}
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
    </div>
  );
};

const StatItem = ({ label, val }: any) => (
  <div className="space-y-1">
    <div className="text-[10px] font-black text-brand-400 uppercase">{label}</div>
    <div className="text-lg font-black">{val}</div>
  </div>
);

const TotalDisplay = ({ label, val, icon, active = false }: any) => (
  <div className={`${active ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} p-5 rounded-3xl border border-slate-100 text-center shadow-sm`}>
    <div className={`text-[10px] font-black uppercase mb-1 ${active ? 'text-brand-400' : 'text-slate-400'}`}>{icon} {label}</div>
    <div className="text-2xl font-black">{val}</div>
  </div>
);

const BaseInput = ({ label, val, onChange }: any) => (
  <div className="flex items-center gap-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
    <span className="text-[9px] font-black text-slate-300 uppercase w-8">{label}</span>
    <input 
      type="number" 
      value={val} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-transparent text-sm font-black text-slate-800 outline-none text-right"
    />
  </div>
);
