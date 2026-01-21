
import React, { useState, useRef } from 'react';
import { MealEntry } from '../types';
import { analyzeMealImage } from '../services/gemini';
import { getDailyMeals } from '../storage';

interface Props {
  onAdd: (meal: MealEntry) => void;
  onDelete: (id: string) => void;
  dailyTotal: { cal: number, prot: number, carbs: number, fats: number };
  mealHistory: MealEntry[];
}

export const ScannerModule: React.FC<Props> = ({ onAdd, onDelete, dailyTotal, mealHistory }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Partial<MealEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayMeals = getDailyMeals(mealHistory);

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
    setError(null); setResult(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;
      setPreview(originalBase64);
      setLoading(true);
      try {
        const compressedBase64 = await compressImage(originalBase64);
        const data = await analyzeMealImage(compressedBase64);
        setResult(data);
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!result || result.calories === undefined) return;
    onAdd({
      id: crypto.randomUUID(),
      name: result.name || 'Maaltijd',
      calories: result.calories || 0,
      protein: result.protein || 0,
      carbs: result.carbs || 0,
      fats: result.fats || 0,
      fiber: result.fiber || 0,
      date: new Date().toISOString()
    });
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="p-6 space-y-8 pb-24 animate-slide-up">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AI Scanner</h2>
        <p className="text-sm text-slate-500 font-medium">Bord, fles of verpakking.</p>
      </header>

      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-4 gap-2 text-center">
        <StatItem label="Kcal" value={dailyTotal.cal} color="text-slate-900" />
        <StatItem label="Eiwit" value={`${dailyTotal.prot}g`} color="text-brand-500" />
        <StatItem label="Koolh" value={`${dailyTotal.carbs}g`} color="text-orange-500" />
        <StatItem label="Vet" value={`${dailyTotal.fats}g`} color="text-yellow-500" />
      </div>

      {!preview ? (
        <div className="space-y-8">
          <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-brand-500 active:scale-95 transition-all group">
            <div className="text-4xl">📸</div>
            <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Maak foto</span>
          </button>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Log van vandaag</h3>
            {todayMeals.map(m => (
              <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold">{m.calories} kcal • {m.protein}g eiwit</div>
                </div>
                <button onClick={() => onDelete(m.id)} className="text-slate-300 hover:text-red-400 p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
            {todayMeals.length === 0 && <p className="text-center text-slate-300 py-4 text-xs italic">Nog niets gegeten vandaag.</p>}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl relative">
          <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
          {loading && <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-4"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div><p className="font-black text-slate-900 animate-pulse text-[10px]">AI ANALYSEERT...</p></div>}
          {result && !loading && (
            <div className="p-8 space-y-6 animate-slide-up">
              <div><h3 className="text-2xl font-black text-slate-900 leading-tight">{result.name}</h3><p className="text-4xl font-black text-brand-600 mt-2">{result.calories} <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">kcal</span></p></div>
              <div className="grid grid-cols-3 gap-4 border-y py-4 text-center">
                <div><div className="text-[10px] font-black text-slate-300 uppercase">Eiwit</div><div className="font-bold">{result.protein}g</div></div>
                <div><div className="text-[10px] font-black text-slate-300 uppercase">Koolh</div><div className="font-bold">{result.carbs}g</div></div>
                <div><div className="text-[10px] font-black text-slate-300 uppercase">Vet</div><div className="font-bold">{result.fats}g</div></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setPreview(null); setResult(null); }} className="flex-1 bg-slate-100 font-bold p-5 rounded-2xl">Reset</button>
                <button onClick={handleConfirm} className="flex-[2] bg-brand-600 text-white font-black p-5 rounded-2xl shadow-lg">Toevoegen</button>
              </div>
            </div>
          )}
          {error && !loading && <div className="p-8 text-center space-y-4"><p className="text-red-600 font-bold">{error}</p><button onClick={() => { setPreview(null); setError(null); }} className="w-full bg-slate-900 text-white font-bold p-5 rounded-2xl">Opnieuw</button></div>}
        </div>
      )}
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
    </div>
  );
};

const StatItem = ({ label, value, color }: any) => (
  <div><div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{label}</div><div className={`text-sm font-black ${color}`}>{value}</div></div>
);
