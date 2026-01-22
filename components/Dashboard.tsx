
import React, { useEffect, useState, useMemo } from 'react';
import { AppState } from '../types';
import { getAIInsights } from '../services/gemini';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDailyMeals } from '../storage';

interface Props {
  state: AppState;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<Props> = ({ state, onOpenSettings }) => {
  const [insights, setInsights] = useState<string>('Gegevens analyseren...');
  const [loading, setLoading] = useState(false);

  const healthHistory = state.healthHistory || [];
  const latestHealth = useMemo(() => {
    if (!healthHistory.length) return undefined;
    return [...healthHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [healthHistory]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (state.workouts.length === 0 && healthHistory.length === 0) {
        setInsights("Voeg trainingen of gezondheidsdata toe voor AI-inzichten.");
        return;
      }
      setLoading(true);
      const text = await getAIInsights(state);
      setInsights(text);
      setLoading(false);
    };
    fetchInsights();
  }, [state]);

  const dailyTotals = useMemo(() => {
    const today = getDailyMeals(state.mealHistory || []);
    return today.reduce((acc, m) => ({
      cal: acc.cal + (m.calories || 0),
      prot: acc.prot + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fats: acc.fats + (m.fats || 0)
    }), { cal: 0, prot: 0, carbs: 0, fats: 0 });
  }, [state.mealHistory]);

  const weightData = healthHistory.map(h => ({
    date: new Date(h.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }),
    weight: h.weight
  })).slice(-7);

  // Sync goals strictly with latestHealth from state
  const goals = useMemo(() => ({
    cal: latestHealth?.calories || 2500,
    prot: latestHealth?.protein || 180,
    carbs: latestHealth?.carbs_goal || 250,
    fats: latestHealth?.fats_goal || 70
  }), [latestHealth]);

  const caloriesRemaining = goals.cal - dailyTotals.cal;
  const isOverLimit = caloriesRemaining < 0;
  const calColor = isOverLimit ? 'text-red-500' : 'text-slate-900';

  return (
    <div className="p-6 space-y-8 pb-24 animate-slide-up">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CyberFit Dashboard</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button 
          onClick={onOpenSettings}
          className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
          title="Instellingen"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>
      </header>

      {/* Daily Progress - Detailed Macro View */}
      <section className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Huidig Doel: {goals.cal} kcal</h3>
            <div className="text-sm font-bold text-slate-600">
               {dailyTotals.cal} <span className="text-slate-200">/</span> {goals.cal} kcal
            </div>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-black ${calColor}`}>{Math.abs(caloriesRemaining)}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">{isOverLimit ? 'kcal over limiet' : 'kcal te gaan'}</span>
          </div>
        </div>
        
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${isOverLimit ? 'bg-red-500' : 'bg-brand-500'}`} 
            style={{ width: `${Math.min((dailyTotals.cal / goals.cal) * 100, 100)}%` }}
          ></div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <MacroProgress label="Eiwit" current={dailyTotals.prot} goal={goals.prot} color="bg-brand-500" />
          <MacroProgress label="Koolh" current={dailyTotals.carbs} goal={goals.carbs} color="bg-orange-500" />
          <MacroProgress label="Vet" current={dailyTotals.fats} goal={goals.fats} color="bg-yellow-500" />
        </div>
      </section>

      {/* AI Coach Insights */}
      <section className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl group-hover:bg-brand-500/20 transition-all"></div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-brand-500/20 rounded-xl">
            <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-400">AI Performance Coach</h2>
        </div>
        <div className={`text-sm leading-relaxed font-medium ${loading ? 'opacity-40 animate-pulse' : 'opacity-100'}`}>
          {insights}
        </div>
      </section>

      {/* Weight Chart */}
      <section className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Gewichtsverloop (7d)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightData}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

const MacroProgress = ({ label, current, goal, color }: any) => {
  const isOver = current > goal;
  const displayColor = isOver ? 'bg-red-500' : color;
  const textColor = isOver ? 'text-red-500 font-black' : 'text-slate-900';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
        <span className={`text-[10px] ${textColor}`}>{current}g / {goal}g</span>
      </div>
      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
        <div 
          className={`h-full ${displayColor} transition-all duration-1000`} 
          style={{ width: `${Math.min((current / goal) * 100, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};
