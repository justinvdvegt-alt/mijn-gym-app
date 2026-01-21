
export interface ExerciseEntry {
  id: string;
  name: string;
  weight: number;
  reps: number;
  date: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  label: string; // e.g., "Full Body - Dag 1"
  exercises: ExerciseEntry[];
  isCompleted: boolean;
}

export interface CardioEntry {
  id: string;
  type: 'run' | 'cycle' | 'walk';
  distance: number; // km
  duration: number; // minutes
  date: string;
  source: 'manual' | 'strava';
}

export interface HealthStats {
  date: string;
  sleep: number; // hours
  calories: number;
  protein: number;
  weight: number;
  height?: number; // cm
  age?: number;
  goal?: string;
}

export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  date: string;
}

export type TabType = 'dashboard' | 'gym' | 'cardio' | 'scanner' | 'health';

export interface AppState {
  workouts: WorkoutSession[];
  cardioHistory: CardioEntry[];
  healthHistory: HealthStats[];
  mealHistory: MealEntry[];
  stravaLinked: boolean;
  gymHistory?: ExerciseEntry[];
}
