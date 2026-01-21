
import React, { useState, useRef, useMemo } from 'react';
import { MealEntry } from '../types';
import { analyzeMealImage } from '../services/gemini';
import { getDailyMeals } from '../storage';

interface Props {
  onAdd: (meal: MealEntry) => void;
  onDelete: (id: string) => void;
  dailyTotal: { cal: number, prot: number, carbs: number, fats: number };
  mealHistory: MealEntry[];
}

interface BaseValues {
  name: string;
  cal100: number;
  prot100: number;
  carbs100: number;
  fats100: number;
  unit: string;
}

export const ScannerModule: React.FC<Props> = ({ onAdd, onDelete, dailyTotal, mealHistory }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Calculator State
  const [baseData, setBaseData] = useState<BaseValues | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [editName, setEditName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const todayMeals = getDailyMeals(mealHistory);

  // Live berekende waarden
  const calculatedTotals = useMemo(() => {
    if (!baseData) return { cal: 0, prot: 0, carbs: 0, fats: 0 };
    const factor = quantity / 100;
    return {
      cal: Math.round(baseData.cal100 * factor),
      prot: Number((baseData.prot100 * factor).toFixed(1)),
      carbs: Number((baseData.carbs100 * factor).toFixed(1)),
      fats: Number((baseData.fats100 * factor).toFixed(1))
    };
  }, [baseData, quantity]);

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
    setBaseData(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;
      setPreview(originalBase64);
      setLoading(true);
      try {
        const compressedBase64 = await compressImage(originalBase64);
        const data = await analyzeMealImage(compressedBase64);
        
        setBaseData({
          name: data.name,
          cal100: data.caloriesPer100,
          prot100: data.proteinPer100,
          carbs100: data.carbsPer100,
          fats100: data.fatsPer100,
          unit: data.unit || 'g'
        });
        setEditName(data.name);
        setQuantity(100); // Reset naar standaard
      } catch (err: any) { 
        setError(err.message); 
      } finally { 
        setLoading(false); 
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinalSave = () => {
    if (!baseData) return;
    onAdd({
      id: crypto.randomUUID(),
      name: editName || baseData.name,
      calories: calculatedTotals.cal,
      protein: calculatedTotals.prot,
      carbs: calculatedTotals.carbs,
      fats: calculatedTotals.fats,
      fiber: 0,
      date: new Date().toISOString()
    });
    setPreview(null);
    setBaseData(null);
  };

  return (
    <div className="p-6 space-y-8 pb-24 animate-slide-up">
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Food Scanner</h2>
        <p className="text-sm text-slate-500 font-medium">Scan je bord of het voedingslabel.</p>
      </header>

      {/* Daily Progress Dashboard */}
      <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl grid grid-cols-4 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">Kcal</div>
          <div className="text-lg font-black">{dailyTotal.cal}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">🥩 Eiwit</div>
          <div className="text-lg font-black">{dailyTotal.prot}g</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">🍞 Koolh</div>
          <div className="text-lg font-black">{dailyTotal.carbs}g</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">🥑 Vet</div>
          <div className="text-lg font-black">{dailyTotal.fats}g</div>
        </div>
      </div>

      {!preview ? (
        <div className="space-y-8">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full aspect-video bg-white border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-brand-500 hover:bg-slate-50 active:scale-95 transition-all group shadow-sm"
          >
            <div className="text-5xl group-hover:scale-110 transition-transform">📸</div>
            <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Start AI Scan</span>
          </button>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Log van vandaag</h3>
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
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[40px]">
                  <p className="text-slate-300 text-sm font-bold italic">Nog geen maaltijden gelogd.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl relative animate-slide-up">
          <div className="relative aspect-video w-full">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {loading && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 text-white p-8 text-center">
                <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_#0ea5e9]"></div>
                <div className="space-y-2">
                  <p className="font-black text-xl uppercase tracking-widest animate-pulse">AI Analyseert...</p>
                  <p className="text-xs font-bold text-slate-400">Scanner zoekt naar etiketten en volume per 100 eenheden.</p>
                </div>
              </div>
            )}
          </div>

          {baseData && !loading && (
            <div className="p-8 space-y-6">
              <div className="space-y-5">
                {/* Product Naam Bewerken */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Product Naam</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-transparent text-xl font-black text-slate-900 outline-none"
                  />
                </div>

                {/* Dynamische Calculator: Hoeveelheid */}
                <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100 shadow-inner">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Hoeveelheid ({baseData.unit})</label>
                    <span className="text-xs font-black text-brand-400">Factor: {(quantity / 100).toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="flex-1 bg-white p-4 rounded-2xl text-4xl font-black text-slate-900 outline-none shadow-sm border-2 border-transparent focus:border-brand-500"
                    />
                    <div className="text-2xl font-black text-brand-600">{baseData.unit}</div>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="1000" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full mt-6 accent-brand-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Live Macro Resultaten */}
                <div className="grid grid-cols-2 gap-4">
                  <MacroDisplay label="Totaal Kcal" value={calculatedTotals.cal} icon="🔥" color="text-slate-900" />
                  <MacroDisplay label="Eiwit" value={calculatedTotals.prot} icon="🥩" color="text-brand-600" suffix="g" />
                  <MacroDisplay label="Koolhydraten" value={calculatedTotals.carbs} icon="🍞" color="text-orange-600" suffix="g" />
                  <MacroDisplay label="Vetten" value={calculatedTotals.fats} icon="🥑" color="text-yellow-600" suffix="g" />
                </div>
                <p className="text-[10px] text-center text-slate-400 font-bold italic">
                  Berekend op basis van {baseData.cal100} kcal per 100{baseData.unit}
                </p>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => { setPreview(null); setBaseData(null); }} 
                  className="flex-1 bg-slate-100 text-slate-600 font-black py-5 rounded-3xl active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Annuleren
                </button>
                <button 
                  onClick={handleFinalSave} 
                  className="flex-[2] bg-brand-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-brand-100 active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Opslaan in Logboek
                </button>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-10 text-center space-y-6">
              <div className="text-4xl">⚠️</div>
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

const MacroDisplay = ({ label, value, icon, color, suffix = "" }: any) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
    <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{icon} {label}</div>
    <div className={`text-2xl font-black ${color}`}>{value}{suffix}</div>
  </div>
);
