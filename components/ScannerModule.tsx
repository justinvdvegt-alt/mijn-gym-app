
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setLoading(true);
      setResult(null);

      try {
        const data = await analyzeMealImage(base64);
        setResult(data);
      } catch (err) {
        alert("Kon maaltijd niet scannen. Probeer het opnieuw.");
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
      name: result.name || 'Gescande Maaltijd',
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
    <div className="p-6 space-y-8 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">AI Macro Scanner</h2>
          <p className="text-sm text-slate-500 font-medium">Scan je maaltijd voor instant macro's.</p>
        </div>
      </header>

      {/* Daily Total Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Kcal</div>
          <div className="text-sm font-bold text-slate-900">{dailyTotal.cal}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-brand-500 uppercase">Eiwit</div>
          <div className="text-sm font-bold text-slate-900">{dailyTotal.prot}g</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-orange-500 uppercase">Koolh</div>
          <div className="text-sm font-bold text-slate-900">{dailyTotal.carbs}g</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-yellow-500 uppercase">Vet</div>
          <div className="text-sm font-bold text-slate-900">{dailyTotal.fats}g</div>
        </div>
      </div>

      <div className="space-y-4">
        {!preview ? (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-square bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-brand-500 transition-all active:scale-95"
          >
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Scan Maaltijd</span>
          </button>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl relative animate-in zoom-in-95 duration-300">
            <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
            
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-heading font-bold text-slate-900 animate-pulse">AI Analyseert...</p>
              </div>
            )}

            {result && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-heading font-bold text-slate-900">{result.name}</h3>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{result.calories} <span className="text-sm font-normal text-slate-400">kcal</span></p>
                </div>

                <div className="space-y-3">
                  <MacroRow label="Eiwitten" value={result.protein} color="bg-brand-500" unit="g" />
                  <MacroRow label="Koolhydraten" value={result.carbs} color="bg-orange-500" unit="g" />
                  <MacroRow label="Vetten" value={result.fats} color="bg-yellow-400" unit="g" />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setPreview(null); setResult(null); }}
                    className="flex-1 bg-slate-100 text-slate-600 font-bold p-4 rounded-2xl active:scale-95 transition-all"
                  >
                    Opnieuw
                  </button>
                  <button 
                    onClick={handleConfirm}
                    className="flex-[2] bg-brand-600 text-white font-bold p-4 rounded-2xl shadow-lg shadow-brand-100 active:scale-95 transition-all"
                  >
                    Toevoegen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleCapture} 
        className="hidden" 
      />
    </div>
  );
};

const MacroRow = ({ label, value, color, unit }: any) => {
  const width = Math.min(100, (value / 50) * 100); // Visual scaling
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>{label}</span>
        <span className="text-slate-900">{value}{unit}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${width}%` }}></div>
      </div>
    </div>
  );
};
