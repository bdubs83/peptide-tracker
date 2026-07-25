export type MetabolicSex = "female" | "male" | "unspecified";

export const healthProfileBirthDateKey = "health_profile_birth_date";
export const healthProfileSexKey = "health_profile_metabolic_sex";
export const healthProfileHeightCmKey = "health_profile_height_cm";

export const calculateAge = (birthDate: string, referenceDate = new Date()) => {
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = referenceDate.getFullYear() - year;
  if (referenceDate.getMonth() + 1 < month || (referenceDate.getMonth() + 1 === month && referenceDate.getDate() < day)) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
};

export const calculateBmi = (weightKg: number, heightCm: number) => {
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  return weightKg / ((heightCm / 100) ** 2);
};

export const calculateRmr = (weightKg: number, heightCm: number, age: number, sex: MetabolicSex) => {
  if (!(weightKg > 0) || !(heightCm > 0) || !(age >= 18) || sex === "unspecified") return null;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
};

export const estimateStepCalories = (steps: number, weightKg: number, distanceKm?: number) => {
  if (!(steps > 0) || !(weightKg > 0)) return null;
  if (distanceKm && distanceKm > 0) return 0.5 * weightKg * distanceKm;
  return steps * weightKg * 0.0005;
};
