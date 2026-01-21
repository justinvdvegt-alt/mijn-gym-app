
import React, { useState, useRef } from 'react';
import { MealEntry } from '../types';
import { analyzeMealImage } from '../services/gemini';

interface Props {
  onAdd: (meal: MealEntry) => void;
  dailyTotal: { cal: number, prot: number, carbs: number, fats: number };
}

export const ScannerModule: React.FC<Props> = ({ onAdd, dailyTotal }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Partial<MealEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; // Iets groter voor meer detail
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9)); // Hogere kwaliteit JPEG
      };
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;
      setLoading(true);
      setPreview(originalBase64);
      setResult(null);

      try {
        const compressedBase64 = await compressImage(originalBase64);
        const data = await analyzeMealImage(compressedBase64);
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Analyse mislukt. Probeer het opnieuw.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!result) return;
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
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AI Macro Scanner</h2>
        <p className="text-sm text-slate-500 font-medium">Scan je maaltijd voor instant resultaat.</p>
      </header>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-4 gap-2 text-center">
        <div><div className="text-[10px] font-bold text-slate-400 uppercase">Kcal</div><div className="text-sm font-bold text-slate-900">{dailyTotal.cal}</div></div>
        <div><div className="text-[10px] font-bold text-brand-500 uppercase">Eiwit</div><div className="text-sm font-bold text-slate-900">{dailyTotal.prot}g</div></div>
        <div><div className="text-[10px] font-bold text-orange-500 uppercase">Koolh</div><div className="text-sm font-bold text-slate-900">{dailyTotal.carbs}g</div></div>
        <div><div className="text-[10px] font-bold text-yellow-500 uppercase">Vet</div><div className="text-sm font-bold text-slate-900">{dailyTotal.fats}g</div></div>
      </div>

      <div className="space-y-4">
        {!preview ? (
          <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-square bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-brand-500 active:scale-95 transition-all">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center text-2xl">📸</div>
            <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Foto maken</span>
          </button>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl relative">
            <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-slate-900 animate-pulse uppercase tracking-widest text-[10px]">AI analyseert...</p>
              </div>
            )}
            {result && !loading && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{result.name}</h3>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{result.calories} <span className="text-sm font-normal text-slate-400">kcal</span></p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setPreview(null); setResult(null); }} className="flex-1 bg-slate-100 text-slate-600 font-bold p-4 rounded-2xl active:scale-95 transition-all">Opnieuw</button>
                  <button onClick={handleConfirm} className="flex-[2] bg-brand-600 text-white font-bold p-4 rounded-2xl shadow-lg active:scale-95 transition-all">Toevoegen</button>
                </div>
              </div>
            )}
            {error && !loading && !result && (
              <div className="p-6 text-center space-y-4">
                <p className="text-red-600 text-sm font-bold">{error}</p>
                <button onClick={() => { setPreview(null); setError(null); }} className="w-full bg-slate-900 text-white font-bold p-4 rounded-2xl">Probeer Opnieuw</button>
              </div>
            )}
          </div>
        )}
      </div>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
    </div>
  );
};

const MacroRow = ({ label, value, color, unit }: any) => {
  const width = Math.min(100, ((value || 0) / 50) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>{label}</span>
        <span className="text-slate-900">{value || 0}{unit}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${width}%` }}></div>
      </div>
    </div>
  );
};
