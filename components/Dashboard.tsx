import React, { useEffect, useState } from 'react';
import { AppState } from '../types';
import { getAIInsights } from '../services/gemini';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Props {
  state: AppState;
}

export const Dashboard: React.FC<Props> = ({ state }) => {
  const [insights, setInsights] = useState<string>('Gegevens analyseren...');
  const [loading, setLoading] = useState(false);

  const gymHistory = state.gymHistory || [];
  const healthHistory = state.healthHistory || [];

  useEffect(() => {
    const fetchInsights = async () => {
      if (gymHistory.length === 0 && healthHistory.length === 0) {
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

  const weightData = healthHistory.map(h => ({
    date: new Date(h.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }),
    weight: h.weight
  })).slice(-7);

  const performanceData = gymHistory.filter(g => g.name.toLowerCase().includes('squat')).map(g => ({
    date: new Date(g.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }),
    weight: g.weight
  })).slice(-7);

  return (
    <div className="p-6 space-y-8 pb-24">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Mijn Overzicht</h1>
        <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></div>
      </header>

      {/* AI Section */}
      <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-10">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-brand-50 rounded-lg">
            <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h2 className="text-sm font-heading font-bold text-brand-700 uppercase tracking-wider">Smart Insights</h2>
        </div>
        <div className={`text-slate-700 leading-relaxed font-body ${loading ? 'opacity-40 animate-pulse' : 'opacity-100'}`}>
          {insights}
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-6 font-heading">Gewichtsverloop (7d)</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500 mb-6 font-heading">Squat Kracht</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={3} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-brand-200 transition-colors">
          <div className="text-[11px] text-slate-400 font-bold uppercase mb-1 font-heading">Calorieën</div>
          <div className="text-3xl font-bold text-slate-900 font-heading">
            {healthHistory[healthHistory.length-1]?.calories || 0}
            <span className="text-xs text-slate-400 ml-1 font-normal uppercase">kcal</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-brand-200 transition-colors">
          <div className="text-[11px] text-slate-400 font-bold uppercase mb-1 font-heading">Eiwitten</div>
          <div className="text-3xl font-bold text-slate-900 font-heading">
            {healthHistory[healthHistory.length-1]?.protein || 0}
            <span className="text-xs text-slate-400 ml-1 font-normal uppercase">g</span>
          </div>
        </div>
      </div>
    </div>
  );
};