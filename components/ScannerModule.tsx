
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
  
  // De 'Basis': altijd per 100g of 100ml
  const [baseNutrition, setBaseNutrition] = useState<NutritionData | null>(null);
  // De 'Portie': standaard op 100
  const [quantity, setQuantity] = useState<number>(100);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "barcode-scanner-viewport";

  const todayMeals = getDailyMeals(mealHistory);

  // LIVE BEREKENING: Reageert direct op baseNutrition OF quantity wijzigingen
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
        scannerRef.current.stop().catch(() => {});
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
          { fps: 15, qrbox: { width: 280, height: 160 } },
          async (decodedText) => { await handleBarcodeResult(decodedText); },
          () => {} // silent failure for scan attempts
        );
      } catch (err) {
        setError("Camera kon niet worden gestart.");
        setMode('idle');
      }
    }, 150);
  };

  const handleBarcodeResult = async (barcode: string) => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch(e){}
    }
    setLoading(true);
    setMode('idle');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const nut = p.nutriments;
        setBaseNutrition({
          product_naam: p.product_name || "Barcode Product",
          eenheid: p.product_name?.toLowerCase().includes('drank') || nut['energy-kcal_unit'] === 'ml' ? 'ml' : 'g',
          kcal_per_100: Math.round(nut['energy-kcal_100'] || 0),
          eiwit_per_100: Number(nut.proteins_100 || 0),
          koolhydraten_per_100: Number(nut.carbohydrates_100 || 0),
          vet_per_100: Number(nut.fat_100 || 0)
        });
        setQuantity(100);
      } else {
        throw new Error("Product onbekend in database.");
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
    if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
    }
  };

  const updateField = (key: keyof NutritionData, val: any) => {
    if (!baseNutrition) return;
    setBaseNutrition({ ...baseNutrition, [key]: val });
  };

  return (
    <div className="p-6 space-y-8 pb-32 animate-slide-up bg-white min-h-screen">
      <header>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Fitness Scanner</h2>
        <p className="text-sm text-slate-500 font-medium">Hybride Barcode & AI Vision.</p>
      </header>

      {/* Top Stats Monitor */}
      <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl grid grid-cols-4 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-brand-400 uppercase">Vandaag</div>
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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-slide-up">
          <div id={scannerId} className="flex-1 w-full bg-black"></div>
          <div className="p-10 bg-black/90 backdrop-blur-md flex justify-center">
            <button onClick={reset} className="bg-white text-black px-12 py-5 rounded-full font-black uppercase tracking-widest shadow-2xl">Sluiten</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center space-y-1">
            <p className="font-black text-slate-900 uppercase tracking-widest animate-pulse">Data Extractie...</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Label wordt gelezen</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-10 rounded-[40px] border border-red-100 text-center space-y-6">
          <div className="text-5xl">⚠️</div>
          <p className="text-red-600 font-black text-sm uppercase tracking-tight">{error}</p>
          <button onClick={reset} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-lg">Opnieuw</button>
        </div>
      )}

      {baseNutrition && !loading && (
        <div className="space-y-8 animate-slide-up">
          {preview && (
            <div className="rounded-[40px] overflow-hidden aspect-video border-4 border-slate-50 shadow-2xl">
              <img src={preview} className="w-full h-full object-cover" alt="Scan result" />
            </div>
          )}

          <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Product (Gevonden via OCR/DB)</label>
               <input 
                 type="text" 
                 value={baseNutrition.product_naam} 
                 onChange={(e) => updateField('product_naam', e.target.value)}
                 className="w-full bg-white p-5 rounded-2xl text-lg font-black text-slate-900 border-2 border-transparent focus:border-brand-500 outline-none shadow-sm transition-all"
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
                   value={baseNutrition.eiwit_per_100} 
                   onChange={(e) => updateField('eiwit_per_100', Number(e.target.value))}
                   className="w-full bg-white p-5 rounded-2xl text-2xl font-black text-slate-900 outline-none shadow-sm"
                 />
               </div>
            </div>

            {/* PORTIE CALCULATOR */}
            <div className="bg-brand-600 p-8 rounded-[32px] text-white shadow-xl space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
               <div className="flex justify-between items-center">
                 <span className="text-3xl font-black tracking-tighter">{quantity} {baseNutrition.eenheid}</span>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Gekozen Portie</span>
               </div>
               <input 
                 type="range" min="1" max="1000" step="1" value={quantity} 
                 onChange={(e) => setQuantity(Number(e.target.value))}
                 className="w-full h-3 bg-brand-400 rounded-lg appearance-none cursor-pointer accent-white"
               />
               <div className="flex gap-2">
                   {[100, 250, 500].map(val => (
                       <button key={val} onClick={() => setQuantity(val)} className="flex-1 bg-brand-700/50 py-2 rounded-xl text-[10px] font-black uppercase">{val}{baseNutrition.eenheid}</button>
                   ))}
               </div>
            </div>

            {/* LIVE TOTAAL WEERGAVE */}
            <div className="bg-slate-900 p-8 rounded-[32px] text-white text-center space-y-5 relative">
               <div className="text-[10px] font-black uppercase text-brand-400 tracking-widest">Totaal voor deze portie</div>
               <div className="text-6xl font-black tracking-tighter tabular-nums">{liveTotals?.calories} <span className="text-xl opacity-30">kcal</span></div>
               <div className="grid grid-cols-3 gap-2 pt-5 border-t border-white/5">
                 <div className="space-y-1">
                   <div className="text-[9px] font-black opacity-40 uppercase">Eiwit</div>
                   <div className="font-black text-lg">{liveTotals?.protein}g</div>
                 </div>
                 <div className="space-y-1">
                   <div className="text-[9px] font-black opacity-40 uppercase">Koolh</div>
                   <div className="font-black text-lg">{liveTotals?.carbs}g</div>
                 </div>
                 <div className="space-y-1">
                   <div className="text-[9px] font-black opacity-40 uppercase">Vet</div>
                   <div className="font-black text-lg">{liveTotals?.fats}g</div>
                 </div>
               </div>
            </div>

            <div className="flex gap-4">
               <button onClick={reset} className="flex-1 bg-white text-slate-400 py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-sm active:scale-95 transition-all">Reset</button>
               <button onClick={handleSave} className="flex-[2] bg-brand-600 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-100 active:scale-95 transition-all">Log Maaltijd</button>
            </div>
          </div>
        </div>
      )}

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
    </div>
  );
};
