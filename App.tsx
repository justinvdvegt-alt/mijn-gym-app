
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, TabType, ExerciseEntry, CardioEntry, HealthStats, MealEntry, WorkoutSession } from './types';
import { loadState, saveState, getLatestHealth, getDailyMeals } from './storage';
import { Dashboard } from './components/Dashboard';
import { GymModule } from './components/GymModule';
import { CardioModule } from './components/CardioModule';
import { HealthModule } from './components/HealthModule';
import { ScannerModule } from './components/ScannerModule';
import { handleStravaCallback } from './services/strava';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleStravaCallback(code).then(() => {
        setState(prev => ({ ...prev, stravaLinked: true }));
        setActiveTab('cardio');
      });
    }
  }, []);

  const handleStartSession = (label: string) => {
    const newSession: WorkoutSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      label,
      exercises: [],
      isCompleted: false
    };
    setState(prev => ({ ...prev, workouts: [...prev.workouts, newSession] }));
  };

  const handleAddSet = (sessionId: string, entry: ExerciseEntry) => {
    setState(prev => ({
      ...prev,
      workouts: prev.workouts.map(w => 
        w.id === sessionId ? { ...w, exercises: [...w.exercises, entry] } : w
      )
    }));
  };

  const handleFinishSession = (sessionId: string) => {
    setState(prev => ({
      ...prev,
      workouts: prev.workouts.map(w => 
        w.id === sessionId ? { ...w, isCompleted: true } : w
      )
    }));
  };

  const handleDeleteWorkout = (id: string) => {
    if (confirm('Wil je deze training verwijderen?')) {
      setState(prev => ({ ...prev, workouts: prev.workouts.filter(w => w.id !== id) }));
    }
  };

  const handleAddCardio = (entry: CardioEntry) => {
    setState(prev => ({ ...prev, cardioHistory: [entry, ...prev.cardioHistory] }));
  };

  const handleDeleteCardio = (id: string) => {
    setState(prev => ({ ...prev, cardioHistory: prev.cardioHistory.filter(c => c.id !== id) }));
  };

  const handleAddHealth = (stats: HealthStats) => {
    setState(prev => ({ ...prev, healthHistory: [...prev.healthHistory, stats] }));
  };

  const handleAddMeal = (meal: MealEntry) => {
    setState(prev => ({ ...prev, mealHistory: [meal, ...prev.mealHistory] }));
  };

  const handleDeleteMeal = (id: string) => {
    setState(prev => ({ ...prev, mealHistory: prev.mealHistory.filter(m => m.id !== id) }));
  };

  const dailyTotal = useMemo(() => {
    const today = getDailyMeals(state.mealHistory || []);
    return today.reduce((acc, m) => ({
      cal: acc.cal + (m.calories || 0),
      prot: acc.prot + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fats: acc.fats + (m.fats || 0)
    }), { cal: 0, prot: 0, carbs: 0, fats: 0 });
  }, [state.mealHistory]);

  const dashboardState = useMemo(() => {
    const gymHistory = state.workouts.flatMap(w => w.exercises);
    return { ...state, gymHistory };
  }, [state]);

  return (
    <div className="min-h-screen bg-white font-body flex flex-col max-w-md mx-auto relative border-x border-slate-100 shadow-2xl">
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard state={dashboardState as any} />}
        {activeTab === 'gym' && (
          <GymModule 
            workouts={state.workouts} 
            onAddSet={handleAddSet} 
            onStartSession={handleStartSession}
            onFinishSession={handleFinishSession}
            onDelete={handleDeleteWorkout}
          />
        )}
        {activeTab === 'cardio' && (
          <CardioModule 
            history={state.cardioHistory} 
            onAdd={handleAddCardio} 
            onDelete={handleDeleteCardio}
            stravaLinked={state.stravaLinked}
            onLinkStrava={() => {}}
          />
        )}
        {activeTab === 'scanner' && (
          <ScannerModule 
            onAdd={handleAddMeal} 
            onDelete={handleDeleteMeal}
            dailyTotal={dailyTotal} 
            mealHistory={state.mealHistory}
          />
        )}
        {activeTab === 'health' && (
          <HealthModule onAdd={handleAddHealth} latest={getLatestHealth(state.healthHistory)} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 glass-nav flex justify-around items-center p-5 z-50 max-w-md mx-auto rounded-t-[40px] shadow-2xl">
        <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="🏠" label="Home" />
        <TabButton active={activeTab === 'gym'} onClick={() => setActiveTab('gym')} icon="🏋️" label="Gym" />
        <TabButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon="📸" label="Scan" />
        <TabButton active={activeTab === 'cardio'} onClick={() => setActiveTab('cardio')} icon="🏃" label="Cardio" />
        <TabButton active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon="👤" label="Stats" />
      </nav>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-brand-600 scale-110' : 'text-slate-300'}`}
  >
    <div className="text-xl">{icon}</div>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    {active && <div className="w-1 h-1 bg-brand-600 rounded-full mt-1"></div>}
  </button>
);

export default App;
