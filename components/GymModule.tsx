import React, { useState, useMemo } from 'react';
import { ExerciseEntry, WorkoutSession } from '../types';
import { getPreviousGymEntry } from '../storage';

interface Props {
  workouts: WorkoutSession[];
  onAddSet: (sessionId: string, entry: ExerciseEntry) => void;
  onStartSession: (label: string) => void;
  onFinishSession: (sessionId: string) => void;
}

const COMMON_EXERCISES = [
  "Chest press", "Latt pulldown 1 arm", "T-bar row", "Shoulder press", 
  "Rear delts fly", "Preacher curl", "Tricep rope pushdown", "Leg press", 
  "Hamstring curls", "Callfs press", "Incline smith machine chest", 
  "Latt pulldown", "T-bar row close", "Lateral raises", "Over head extensions tricep"
];

export const GymModule: React.FC<Props> = ({ workouts, onAddSet, onStartSession, onFinishSession }) => {
  const [view, setView] = useState<'active' | 'history'>('active');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [newSessionLabel, setNewSessionLabel] = useState('Full Body - Dag 1');

  const activeSession = useMemo(() => workouts.find(w => !w.isCompleted), [workouts]);
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
          <h2 className="text-2xl font-heading font-bold text-slate-900">Gym Mode</h2>
          <p className="text-sm text-slate-500 font-medium">Log je sets of bekijk je historie.</p>
        </div>
        <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
          <button 
            onClick={() => setView('active')}
            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${view === 'active' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 opacity-60'}`}
          >
            Log
          </button>
          <button 
            onClick={() => setView('history')}
            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${view === 'history' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 opacity-60'}`}
          >
            Historie
          </button>
        </div>
      </div>

      {view === 'active' ? (
        <div className="space-y-6">
          {!activeSession ? (
            <div className="bg-slate-50 p-10 rounded-[40px] border border-dashed border-slate-200 text-center space-y-6">
              <div className="text-4xl">🏋️‍♂️</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nieuwe Training</h3>
                <p className="text-xs text-slate-400 mt-1">Start een sessie om je sets bij te houden.</p>
              </div>
              <div className="space-y-3">
                <select 
                  value={newSessionLabel}
                  onChange={(e) => setNewSessionLabel(e.target.value)}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm"
                >
                  <option>Full Body - Dag 1</option>
                  <option>Full Body - Dag 2</option>
                  <option>Push Day</option>
                  <option>Pull Day</option>
                  <option>Leg Day</option>
                </select>
                <button 
                  onClick={() => onStartSession(newSessionLabel)}
                  className="w-full bg-slate-900 text-white font-bold p-5 rounded-2xl shadow-xl active:scale-95 transition-all"
                >
                  Start Workout
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-brand-600 p-5 rounded-3xl shadow-lg text-white flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-black uppercase opacity-80 tracking-widest">In training</div>
                  <div className="text-xl font-black">{activeSession.label}</div>
                </div>
                <button 
                  onClick={() => onFinishSession(activeSession.id)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors"
                >
                  Klaar
                </button>
              </div>

              <form onSubmit={handleSubmitSet} className="space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="relative">
                    <input 
                      list="exercises" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 p-4 rounded-xl text-lg font-bold outline-none text-center border border-transparent focus:border-brand-200 transition-all"
                      placeholder="Naam oefening..."
                    />
                    <datalist id="exercises">
                      {COMMON_EXERCISES.map(ex => <option key={ex} value={ex} />)}
                    </datalist>
                  </div>

                  {previous && (
                    <div className="bg-brand-50 p-3 rounded-xl flex justify-between text-[11px] font-bold animate-in fade-in zoom-in-95">
                      <span className="text-brand-700">PB / LAATSTE:</span>
                      <span className="text-brand-900">{previous.weight}kg × {previous.reps}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">KG</label>
                    <input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-transparent text-3xl font-black text-center outline-none" placeholder="0" />
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">REPS</label>
                    <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="w-full bg-transparent text-3xl font-black text-center outline-none" placeholder="0" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white font-black p-5 rounded-2xl shadow-xl active:scale-95 transition-all">
                  Log Set
                </button>
              </form>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Huidige Sessie</h4>
                {activeSession.exercises.slice().reverse().map(e => (
                  <div key={e.id} className="bg-white p-4 rounded-2xl border border-slate-50 flex justify-between items-center shadow-sm animate-in slide-in-from-right-4">
                    <span className="font-bold text-slate-800">{e.name}</span>
                    <span className="text-brand-600 font-black tabular-nums">{e.weight}kg × {e.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {completedSessions.map(session => (
            <div key={session.id} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm transition-all hover:shadow-md">
              <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{session.label}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {new Date(session.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', weekday: 'short' })}
                  </p>
                </div>
                <div className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-black text-brand-600">
                  {session.exercises.length} SETS
                </div>
              </div>
              <div className="p-4 space-y-4">
                {(() => {
                  const grouped: Record<string, ExerciseEntry[]> = session.exercises.reduce((acc, curr) => {
                    if (!acc[curr.name]) acc[curr.name] = [];
                    acc[curr.name].push(curr);
                    return acc;
                  }, {} as Record<string, ExerciseEntry[]>);

                  return Object.entries(grouped).map(([exName, sets]) => (
                    <div key={exName} className="flex justify-between items-start pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{exName}</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {sets.map((s, idx) => (
                          <div key={s.id} className="text-[10px] font-black text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded tabular-nums">
                            {s.weight}kg × {s.reps}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          ))}
          {completedSessions.length === 0 && (
            <div className="text-center py-20">
              <div className="text-3xl mb-4 opacity-20">📂</div>
              <p className="text-slate-400 font-bold italic text-sm tracking-tight">Nog geen voltooide trainingen.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};