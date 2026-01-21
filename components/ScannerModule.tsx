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
        const MAX_WIDTH = 1000;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;
      setPreview(originalBase64);
      setLoading(true);

      try {
        const compressedBase64 = await compressImage(originalBase64);
        const data = await analyzeMealImage(compressedBase64);
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Analyse mislukt.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!result || !result.calories && result.calories !== 0) return;
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

  // Check of de AI echt eten heeft gevonden
  const isLikelyFood = result && (result.calories || 0) > 0;

  return (
    <div className="p-6 space-y-8 pb-24 animate-slide-up">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AI Food Scanner</h2>
        <p className="text-sm text-slate-500 font-medium">Maak een foto van je maaltijd.</p>
      </header>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-4 gap-2 text-center">
        <StatItem label="Kcal" value={dailyTotal.cal} color="text-slate-900" />
        <StatItem label="Eiwit" value={`${dailyTotal.prot}g`} color="text-brand-500" />
        <StatItem label="Koolh" value={`${dailyTotal.carbs}g`} color="text-orange-500" />
        <StatItem label="Vet" value={`${dailyTotal.fats}g`} color="text-yellow-500" />
      </div>

      <div className="space-y-4">
        {!preview ? (
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-brand-500 active:scale-95 transition-all"
          >
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm">📸</div>
            <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Open Camera</span>
          </button>
        ) : (
          <div className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl relative">
            <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
            
            {loading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-slate-900 animate-pulse uppercase tracking-[0.2em] text-[10px]">AI analyseert...</p>
              </div>
            )}

            {result && !loading && (
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{result.name}</h3>
                  {isLikelyFood ? (
                    <p className="text-4xl font-black text-brand-600 mt-2">{result.calories} <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">kcal</span></p>
                  ) : (
                    <p className="text-sm font-bold text-orange-500 mt-2 uppercase tracking-widest">Geen voedingswaarden gevonden</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 border-y border-slate-50 py-6">
                  <div className="text-center">
                    <div className="text-[10px] font-black text-slate-300 uppercase mb-1">Eiwit</div>
                    <div className="font-bold text-slate-900">{result.protein}g</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-black text-slate-300 uppercase mb-1">Koolh</div>
                    <div className="font-bold text-slate-900">{result.carbs}g</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-black text-slate-300 uppercase mb-1">Vet</div>
                    <div className="font-bold text-slate-900">{result.fats}g</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setPreview(null); setResult(null); }} className="flex-1 bg-slate-100 text-slate-500 font-bold p-5 rounded-2xl active:scale-95 transition-all">
                    Reset
                  </button>
                  <button 
                    disabled={!isLikelyFood}
                    onClick={handleConfirm} 
                    className={`flex-[2] font-black p-5 rounded-2xl shadow-lg active:scale-95 transition-all ${isLikelyFood ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    Opslaan
                  </button>
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="p-8 text-center space-y-6">
                <div className="text-4xl">⚠️</div>
                <p className="text-slate-600 font-bold leading-relaxed">{error}</p>
                <button onClick={() => { setPreview(null); setError(null); }} className="w-full bg-slate-900 text-white font-bold p-5 rounded-2xl">Probeer Opnieuw</button>
              </div>
            )}
          </div>
        )}
      </div>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
    </div>
  );
};

const StatItem = ({ label, value, color }: any) => (
  <div>
    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{label}</div>
    <div className={`text-sm font-black ${color}`}>{value}</div>
  </div>
);