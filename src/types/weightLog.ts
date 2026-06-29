export interface WeightLog {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  weight: string; // stored as string to match input, parsed for math
  bodyFat?: string;
  waist?: string;
  chest?: string;
  neck?: string;
  arm?: string;
  thigh?: string;
  notes?: string;
  customMeasurements?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
