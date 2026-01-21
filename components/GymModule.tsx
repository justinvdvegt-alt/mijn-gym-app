
import React, { useState, useMemo, useEffect } from 'react';
import { ExerciseEntry, WorkoutSession } from '../types';
import { getPreviousGymEntry } from '../storage';

interface Props {
  workouts: WorkoutSession[];
  onAddSet: (sessionId: string, entry: ExerciseEntry) => void;
  onStartSession: (label: string) => void;
  onFinishSession: (sessionId: string) => void;
  onDelete: (id: string) => void;
}

const COMMON_EXERCISES = [
  "Chest press", "Latt pulldown 1 arm", "T-bar row", "Shoulder press", 
  "Rear delts fly", "Preacher curl", "Tricep rope pushdown", "Leg press", 
  "Hamstring curls", "Callfs press", "Incline smith machine chest", 
  "Latt pulldown", "T-bar row close", "Lateral raises", "Over head extensions tricep"
];

export const GymModule: React.FC<Props> = ({ workouts, onAddSet, onStartSession, onFinishSession, onDelete }) => {
  const [view, setView] = useState<'active' | 'history'>('active');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [newSessionLabel, setNewSessionLabel] = useState('Full Body - Dag 1');
  const [seconds, setSeconds] = useState(0);

  const activeSession = useMemo(() => workouts.find(w => !w.isCompleted), [workouts]);
  
  useEffect(() => {
    let interval: any;
    if (activeSession) {
      const startTime = new Date(activeSession.date).getTime();
      interval = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedSessions = useMemo(() => 
    workouts.filter(w => w.isCompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
  [workouts]);

  const previous = useMemo(() => name ? getPreviousGymEntry(name, workouts) : null, [name, workouts]);

  const handleSubmitSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !weight || !reps || !activeSession) return;
    onAddSet(activeSession.id, {
      id: crypto.randomUUID(),
      name,
      weight: parseFloat(weight),
      reps: parseInt(reps),
      date: new Date().toISOString()
    });
    setWeight('');
    setReps('');
  };

  return (
    <div className="p-6 space-y-6 pb-24 animate-slide-up">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Gym Mode</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progressie loggen</p>
        </div>
        <div className="bg-slate-100 p-1 rounded-2xl flex shadow-inner">
          <button onClick={() => setView('active')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'active' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 opacity-60'}`}>Training</button>
          <button onClick={() => setView('history')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'history' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 opacity-60'}`}>Historie</button>
        </div>
      </div>

      {view === 'active' ? (
        <div className="space-y-6">
          {!activeSession ? (
            <div className="bg-slate-50 p-10 rounded-[40px] border border-dashed border-slate-200 text-center space-y-6">
              <div className="text-4xl animate-bounce">🏋️‍♂️</div>
              <h3 className="text-lg font-black text-slate-900">Klaar voor actie?</h3>
              <div className="space-y-4">
                <select value={newSessionLabel} onChange={(e) => setNewSessionLabel(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm appearance-none text-center">
                  <option>Full Body - Dag 1</option>
                  <option>Full Body - Dag 2</option>
                  <option>Push Day</option>
                  <option>Pull Day</option>
                  <option>Leg Day</option>
                </select>
                <button onClick={() => onStartSession(newSessionLabel)} className="w-full bg-slate-900 text-white font-black p-5 rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest">Start Workout</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-brand-600 p-6 rounded-[32px] shadow-lg text-white space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <div className="text-[10px] font-black uppercase opacity-80 tracking-widest flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Bezig: {formatTime(seconds)}
                    </div>
                    <div className="text-2xl font-black">{activeSession.label}</div>
                  </div>
                </div>
                <button onClick={() => onFinishSession(activeSession.id)} className="w-full bg-white text-brand-600 font-black py-4 rounded-2xl shadow-sm uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all relative z-10">
                  STOP & OPSLAAN TRAINING
                </button>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              </div>

              <form onSubmit={handleSubmitSet} className="space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <input list="exercises" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl text-lg font-black outline-none text-center border-2 border-transparent focus:border-brand-500 transition-all" placeholder="Welke oefening?" />
                  <datalist id="exercises">{COMMON_EXERCISES.map(ex => <option key={ex} value={ex} />)}</datalist>
                  {previous && (
                    <div className="bg-brand-50 p-4 rounded-xl flex justify-between items-center animate-pulse">
                      <span className="text-[10px] font-black text-brand-600 uppercase">Vorige keer:</span>
                      <span className="text-sm font-black text-brand-900">{previous.weight}kg × {previous.reps}</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <label className="text-[10px] font-black text-slate-300 uppercase mb-2 block">Gewicht (kg)</label>
                    <input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-transparent text-4xl font-black text-center outline-none text-slate-900" placeholder="0" />
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <label className="text-[10px] font-black text-slate-300 uppercase mb-2 block">Reps</label>
                    <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="w-full bg-transparent text-4xl font-black text-center outline-none text-slate-900" placeholder="0" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-black p-5 rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest">Log Set</button>
              </form>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Huidige Sessie ({activeSession.exercises.length} sets)</h4>
                {activeSession.exercises.slice().reverse().map(e => (
                  <div key={e.id} className="bg-white p-4 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm animate-slide-up">
                    <span className="font-bold text-slate-800 text-sm">{e.name}</span>
                    <span className="text-brand-600 font-black">{e.weight}kg × {e.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {completedSessions.length === 0 && <p className="text-center text-slate-300 py-10 font-bold italic">Nog geen trainingen in je historie.</p>}
          {completedSessions.map(session => (
            <div key={session.id} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm relative group animate-slide-up">
              <button 
                onClick={() => onDelete(session.id)} 
                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-2 bg-slate-50 rounded-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <div className="p-5 bg-slate-50/50 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">{session.label}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                  {new Date(session.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="p-5 space-y-4">
                {Object.entries(session.exercises.reduce((acc, curr) => {
                  if (!acc[curr.name]) acc[curr.name] = [];
                  acc[curr.name].push(curr);
                  return acc;
                }, {} as any)).map(([exName, sets]: any) => (
                  <div key={exName} className="flex justify-between items-start pb-3 border-b border-slate-50 last:border-0">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700">{exName}</span>
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{sets.length} sets</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {sets.map((s: any) => (
                        <div key={s.id} className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg">
                          {s.weight}kg × {s.reps}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
