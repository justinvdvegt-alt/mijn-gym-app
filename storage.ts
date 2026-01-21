
import { AppState, ExerciseEntry, CardioEntry, HealthStats, MealEntry, WorkoutSession } from './types';

const STORAGE_KEY = 'cyberfit_data_v1';

const defaultState: AppState = {
  workouts: [],
  cardioHistory: [],
  healthHistory: [],
  mealHistory: [],
  stravaLinked: false,
};

export const loadState = (): AppState => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return defaultState;
  try {
    const parsed = JSON.parse(data);
    // Migration: if someone has gymHistory, move it to a generic session
    if (parsed.gymHistory && !parsed.workouts) {
       parsed.workouts = [{
         id: 'legacy',
         date: new Date().toISOString(),
         label: 'Oude Trainingen',
         exercises: parsed.gymHistory,
         isCompleted: true
       }];
    }
    return { ...defaultState, ...parsed };
  } catch (e) {
    console.error('Failed to parse state', e);
    return defaultState;
  }
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getPreviousGymEntry = (exerciseName: string, workouts: WorkoutSession[]): ExerciseEntry | undefined => {
  const allExercises = workouts.flatMap(w => w.exercises);
  return allExercises
    .filter(e => e.name.toLowerCase() === exerciseName.toLowerCase())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

export const getLatestHealth = (history: HealthStats[]): HealthStats | undefined => {
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

export const getDailyMeals = (history: MealEntry[]): MealEntry[] => {
    const today = new Date().toDateString();
    return history.filter(m => new Date(m.date).toDateString() === today);
};
