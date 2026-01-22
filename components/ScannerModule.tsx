
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { MealEntry } from '../types';
import { analyzeMealImage } from '../services/gemini';
import { getDailyMeals } from '../storage';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onAdd: (meal: MealEntry) => void;
  onDelete: (id: string) => void;
  dailyTotal: { cal: number, prot: number, carbs: number, fats: number };
  mealHistory: MealEntry[];
  goalCal?: number;
}

interface NutritionData {
  product_naam: string;
  eenheid: 'g' | 'ml';
  kcal_per_100: number;
  eiwit_per_100: number;
  koolhydraten_per_100: number;
  vet_per_100: number;
}

export const ScannerModule: React.FC<Props> = ({ onAdd, onDelete, dailyTotal, mealHistory, goalCal = 2500 }) => {
  const [mode, setMode] = useState<'idle' | 'barcode' | 'ai'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  // Editable base values (always per 100g/ml)
  const [baseNutrition, setBaseNutrition] = useState<NutritionData | null>(null);
  // Quantity for total calculation - default to 100 as requested
  const [quantity, setQuantity] = useState<number>(100);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "barcode-scanner-viewport";

  const todayMeals = getDailyMeals(mealHistory);

  // LIVE BEREKENING: Live totals calculation using useMemo for immediate feedback
  const liveTotals = useMemo(() => {
    if (!baseNutrition) return null;
    const factor = quantity / 100;
    return {
      name: baseNutrition.product_naam,
      calories: Math.round(baseNutrition.kcal_per_100 * factor),
      protein: Number((baseNutrition.eiwit_per_100 * factor).toFixed(1)),
      carbs: Number((baseNutrition.koolhydraten_per_100 * factor).toFixed(1)),
      fats: Number((baseNutrition.vet_per_100 * factor).toFixed(1))
    };
  }, [baseNutrition, quantity]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startBarcodeScanner = async () => {
    setMode('barcode');
    setError(null);
    setBaseNutrition(null);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          async (decodedText) => { await handleBarcodeResult(decodedText); },
          undefined
        );
      } catch (err) {
        setError("Camera start mislukt.");
        setMode('idle');
      }
    }, 100);
  };

  const handleBarcodeResult = async (barcode: string) => {
    if (scannerRef.current) await scannerRef.current.stop();
    setLoading(true);
    setMode('idle');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const nut = p.nutriments;
        setBaseNutrition({
          product_naam: p.product_name || "Onbekend product",
          eenheid: p.ingredients_text_with_allergens?.toLowerCase().includes('water') ? 'ml' : 'g',
          kcal_per_100: Math.round(nut['energy-kcal_100'] || 0),
          eiwit_per_100: Number(nut.proteins_100 || 0),
          koolhydraten_per_100: Number(nut.carbohydrates_100 || 0),
          vet_per_100: Number(nut.fat_100 || 0)
        });
        setQuantity(100);
      } else {
        throw new Error("Product niet gevonden.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAIScan = () => {
    setError(null);
    setBaseNutrition(null);
    setPreview(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setLoading(true);
      try {
        const data = await analyzeMealImage(base64);
        setBaseNutrition(data);
        setQuantity(100);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!liveTotals) return;
    onAdd({
      id: crypto.randomUUID(),
      name: liveTotals.name,
      calories: liveTotals.calories,
      protein: liveTotals.protein,
      carbs: liveTotals.carbs,
      fats: liveTotals.fats,
      fiber: 0,
      date: new Date().toISOString()
    });
    reset();
  };

  const reset = () => {
    setMode('idle');
    setBaseNutrition(null);
    setPreview(null);
    setLoading(false);
    setError(null);
  };

  const updateField = (key: keyof NutritionData, val: string | number) => {
    if (!baseNutrition) return;
    setBaseNutrition({ ...baseNutrition, [key]: val });
  };

  return (
    <div className="p-6 space-y-8 pb-32 animate-slide-up bg-white min-h-screen">
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">AI Scanner</h2>
        <p className="text-sm text-slate-500 font-medium">Log je voeding met precisie.</p>
      </header>

      {/* Progress Monitor */}
      <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl grid grid-cols-4 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">Kcal</div>
          <div className="text-lg font-black">{dailyTotal.cal} <span className="text-[10px] opacity-30">/ {goalCal}</span></div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">Eiwit</div>
          <div className="text-lg font-black">{dailyTotal.prot}g</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">Koolh</div>
          <div className="text-lg font-black">{dailyTotal.carbs}g</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">Vet</div>
          <div className="text-lg font-black">{dailyTotal.fats}g</div>
        </div>
      </div>

      {mode === 'idle' && !baseNutrition && !loading && !error && (
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={startBarcodeScanner}
            className="aspect-square bg-slate-900 text-white rounded-[40px] flex flex-col items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all group"
          >
            <div className="text-4xl group-hover:scale-110 transition-transform">🏷️</div>
            <span className="text-[10px] font-black uppercase tracking-widest">Scan Barcode</span>
          </button>
          <button 
            onClick={handleAIScan}
            className="aspect-square bg-brand-600 text-white rounded-[40px] flex flex-col items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all group"
          >
            <div className="text-4xl group-hover:scale-110 transition-transform">📸</div>
            <span className="text-[10px] font-black uppercase tracking-widest">AI Foto Scan</span>
          </button>
        </div>
      )}

      {mode === 'barcode' && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div id={scannerId} className="flex-1 w-full bg-black"></div>
          <div className="p-10 bg-black/80 backdrop-blur-md flex justify-center">
            <button onClick={reset} className="bg-white text-black px-10 py-5 rounded-full font-black uppercase tracking-widest">Annuleren</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-900 uppercase tracking-widest animate-pulse">OCR Analyse...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-10 rounded-[40px] border border-red-100 text-center space-y-6">
          <div className="text-4xl">⚠️</div>
          <p className="text-red-600 font-bold">{error}</p>
          <button onClick={reset} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest">Probeer Opnieuw</button>
        </div>
      )}

      {baseNutrition && !loading && (
        <div className="space-y-8 animate-slide-up">
          {preview && (
            <div className="rounded-[40px] overflow-hidden aspect-video border border-slate-100 shadow-lg">
              <img src={preview} className="w-full h-full object-cover" alt="Scan result" />
            </div>
          )}

          {/* EDITABLE FIELDS & LIVE CALCULATOR */}
          <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 space-y-8">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Product</label>
               <input 
                 type="text" 
                 value={baseNutrition.product_naam} 
                 onChange={(e) => updateField('product_naam', e.target.value)}
                 className="w-full bg-white p-5 rounded-2xl text-lg font-black text-slate-900 border-2 border-transparent focus:border-brand-500 outline-none shadow-sm"
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kcal / 100{baseNutrition.eenheid}</label>
                 <input 
                   type="number" 
                   value={baseNutrition.kcal_per_100} 
                   onChange={(e) => updateField('kcal_per_100', Number(e.target.value))}
                   className="w-full bg-white p-5 rounded-2xl text-2xl font-black text-slate-900 outline-none shadow-sm"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Eiwit / 100{baseNutrition.eenheid}</label>
                 <input 
                   type="number" 
                   step="0.1"
                   /* Fixed property name from eiwit_100 to eiwit_per_100 to match NutritionData interface */
                   value={baseNutrition.eiwit_per_100} 
                   onChange={(e) => updateField('eiwit_per_100', Number(e.target.value))}
                   className="w-full bg-white p-5 rounded-2xl text-2xl font-black text-slate-900 outline-none shadow-sm"
                 />
               </div>
            </div>

            {/* INTERACTIEVE CALCULATOR: HOEVEELHEID */}
            <div className="bg-brand-600 p-8 rounded-[32px] text-white shadow-xl space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-3xl font-black">{quantity} {baseNutrition.eenheid}</span>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hoeveelheid ({baseNutrition.eenheid})</span>
               </div>
               <input 
                 type="range" min="1" max="1000" step="1" value={quantity} 
                 onChange={(e) => setQuantity(Number(e.target.value))}
                 className="w-full h-2 bg-brand-400 rounded-lg appearance-none cursor-pointer accent-white"
               />
               <input 
                 type="number" 
                 value={quantity} 
                 onChange={(e) => setQuantity(Number(e.target.value))}
                 className="w-full bg-white/20 p-4 rounded-xl text-center text-xl font-black border-none focus:ring-0 outline-none placeholder-white/50"
                 placeholder="Handmatig invullen..."
               />
            </div>

            {/* VISUELE FEEDBACK: TOTAAL */}
            <div className="bg-slate-900 p-8 rounded-[32px] text-white text-center space-y-4 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
               <div className="text-[10px] font-black uppercase text-brand-400 tracking-widest">Totaal voor deze portie</div>
               <div className="text-5xl font-black">{liveTotals?.calories} <span className="text-xl opacity-40">kcal</span></div>
               <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
                 <div>
                   <div className="text-[9px] font-black opacity-40 uppercase">Eiwit</div>
                   <div className="font-black">{liveTotals?.protein}g</div>
                 </div>
                 <div>
                   <div className="text-[9px] font-black opacity-40 uppercase">Koolh</div>
                   <div className="font-black">{liveTotals?.carbs}g</div>
                 </div>
                 <div>
                   <div className="text-[9px] font-black opacity-40 uppercase">Vet</div>
                   <div className="font-black">{liveTotals?.fats}g</div>
                 </div>
               </div>
            </div>

            <div className="flex gap-4">
               <button onClick={reset} className="flex-1 bg-white text-slate-400 py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-sm">Reset</button>
               <button onClick={handleSave} className="flex-[2] bg-brand-600 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-100 active:scale-95 transition-all">Sessie Opslaan</button>
            </div>
          </div>
        </div>
      )}

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
    </div>
  );
};
