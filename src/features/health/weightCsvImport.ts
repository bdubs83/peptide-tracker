import type { WeightLog } from "../../types/weightLog";

export type WeightCsvImportRow = Omit<WeightLog, "id" | "createdAt" | "updatedAt">;

export type WeightCsvParseResult = {
  rows: WeightCsvImportRow[];
  errors: string[];
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
};

const normalizedHeader = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const normalizeDate = (value: string) => {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : trimmed;
  }
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : normalized;
};

const normalizeTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "12:00";
  const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour <= 23 && minute <= 59) return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const twelveHour = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!twelveHour) return null;
  let hour = Number(twelveHour[1]);
  const minute = Number(twelveHour[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (twelveHour[3].toLowerCase() === "pm" && hour !== 12) hour += 12;
  if (twelveHour[3].toLowerCase() === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const parseNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const formatMeasurement = (value: number) => String(Math.round(value * 100) / 100);

export const parseWeightCsv = (text: string, targetSystem: "imperial" | "metric"): WeightCsvParseResult => {
  const csvRows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (csvRows.length < 2) return { rows: [], errors: ["The CSV does not contain any weight records."] };

  const headers = csvRows[0].map(normalizedHeader);
  const headerIndex = (names: string[]) => headers.findIndex((header) => names.includes(header));
  const dateIndex = headerIndex(["date"]);
  const timeIndex = headerIndex(["time"]);
  const weightIndex = headerIndex(["weight"]);
  const unitIndex = headerIndex(["unit", "weight unit"]);
  const bodyFatIndex = headerIndex(["body fat (%)", "body fat", "bodyfat"]);
  const notesIndex = headerIndex(["notes", "note"]);
  const measurementIndexes = {
    waist: headerIndex(["waist (in)", "waist (cm)", "waist"]),
    chest: headerIndex(["chest (in)", "chest (cm)", "chest"]),
    neck: headerIndex(["neck (in)", "neck (cm)", "neck"]),
    arm: headerIndex(["arm (in)", "arm (cm)", "arm"]),
    thigh: headerIndex(["thigh (in)", "thigh (cm)", "thigh"]),
  };

  if (dateIndex < 0 || weightIndex < 0) {
    return { rows: [], errors: ["The CSV must include Date and Weight columns."] };
  }

  const rows: WeightCsvImportRow[] = [];
  const errors: string[] = [];
  csvRows.slice(1).forEach((values, dataIndex) => {
    const rowNumber = dataIndex + 2;
    const date = normalizeDate(values[dateIndex] ?? "");
    const time = normalizeTime(timeIndex >= 0 ? values[timeIndex] ?? "" : "");
    const weightValue = parseNumber(values[weightIndex] ?? "");
    if (!date || !time || weightValue === null || weightValue === undefined || weightValue === 0) {
      errors.push(`Row ${rowNumber}: invalid date, time, or weight.`);
      return;
    }

    const sourceUnit = (unitIndex >= 0 ? values[unitIndex] : "")?.trim().toLowerCase();
    const sourceSystem = sourceUnit.startsWith("kg") ? "metric" : sourceUnit.startsWith("lb") || !sourceUnit ? "imperial" : null;
    if (!sourceSystem) {
      errors.push(`Row ${rowNumber}: unsupported weight unit "${sourceUnit}".`);
      return;
    }
    const convertedWeight = sourceSystem === targetSystem ? weightValue : sourceSystem === "imperial" ? weightValue / 2.2046226218 : weightValue * 2.2046226218;

    const record: WeightCsvImportRow = { date, time, weight: convertedWeight.toFixed(1) };
    const bodyFat = bodyFatIndex >= 0 ? parseNumber(values[bodyFatIndex] ?? "") : undefined;
    if (bodyFat === null) errors.push(`Row ${rowNumber}: invalid body fat value; imported without it.`);
    else if (bodyFat !== undefined) record.bodyFat = formatMeasurement(bodyFat);

    Object.entries(measurementIndexes).forEach(([key, index]) => {
      if (index < 0) return;
      const measurement = parseNumber(values[index] ?? "");
      if (measurement === null) {
        errors.push(`Row ${rowNumber}: invalid ${key} value; imported without it.`);
        return;
      }
      if (measurement === undefined) return;
      const headerUsesCm = headers[index].includes("(cm)");
      const sourceMeasurementSystem = headerUsesCm ? "metric" : "imperial";
      const converted = sourceMeasurementSystem === targetSystem ? measurement : sourceMeasurementSystem === "imperial" ? measurement * 2.54 : measurement / 2.54;
      record[key as "waist" | "chest" | "neck" | "arm" | "thigh"] = formatMeasurement(converted);
    });

    const notes = notesIndex >= 0 ? (values[notesIndex] ?? "").trim() : "";
    if (notes) record.notes = notes;
    rows.push(record);
  });

  return { rows, errors };
};

export const isDuplicateWeightCsvRow = (row: WeightCsvImportRow, existing: WeightLog[]) =>
  existing.some((entry) => !entry.deletedAt && entry.date === row.date && (entry.time === row.time || Number(entry.weight) === Number(row.weight)));
