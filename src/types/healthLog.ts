export type HealthMetricType =
  | "weight"
  | "bodyFat"
  | "leanBodyMass"
  | "height"
  | "steps"
  | "activeCalories"
  | "totalCalories"
  | "basalCalories"
  | "distance"
  | "elevation"
  | "floors"
  | "heartRateAverage"
  | "heartRateMinimum"
  | "heartRateMaximum"
  | "speedAverage"
  | "stepsCadence"
  | "powerAverage"
  | "vo2Max"
  | "exercise"
  | "nutrition"
  | "hydration"
  | "restingHeartRate"
  | "sleep"
  | "heartRateVariability"
  | "oxygenSaturation"
  | "respiratoryRate";

export type HealthLog = {
  id: string;
  metric: HealthMetricType;
  startTime: string;
  endTime?: string;
  value?: number;
  unit: "kg" | "cm" | "percent" | "count" | "kcal" | "bpm" | "minutes" | "session" | "km" | "m" | "floors" | "km/h" | "steps/min" | "watts" | "ml/kg/min" | "nutrition" | "mL" | "ms" | "breaths/min";
  label?: string;
  details?: Record<string, number | string>;
  source: "healthConnect";
  sourceRecordId?: string;
  createdAt: string;
  updatedAt: string;
};
