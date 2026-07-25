import { describe, expect, it } from "vitest";
import { isDuplicateWeightCsvRow, parseWeightCsv } from "./weightCsvImport";

describe("parseWeightCsv", () => {
  it("parses the tracker export format and quoted notes", () => {
    const result = parseWeightCsv('Date,Time,Weight,Unit,Body Fat (%),Waist (in),Chest (in),Neck (in),Arm (in),Thigh (in),Notes\n2026-05-30,,231,lb,20,40,,,,,"2mg reta, morning"', "imperial");
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([{ date: "2026-05-30", time: "12:00", weight: "231.0", bodyFat: "20", waist: "40", notes: "2mg reta, morning" }]);
  });

  it("converts pounds and inches for a metric profile", () => {
    const result = parseWeightCsv("Date,Weight,Unit,Waist (in)\n06/02/2026,220,lb,40", "metric");
    expect(result.rows[0]).toMatchObject({ date: "2026-06-02", weight: "99.8", waist: "101.6" });
  });

  it("rejects missing required columns and invalid rows", () => {
    expect(parseWeightCsv("When,Mass\nToday,abc", "imperial").errors[0]).toContain("Date and Weight");
    expect(parseWeightCsv("Date,Weight\nnot-a-date,abc", "imperial").rows).toHaveLength(0);
  });
});

describe("isDuplicateWeightCsvRow", () => {
  it("recognizes a re-import even when the source has no time", () => {
    const row = { date: "2026-05-30", time: "12:00", weight: "231.0" };
    expect(isDuplicateWeightCsvRow(row, [{ id: "1", date: "2026-05-30", time: "08:00", weight: "231", createdAt: "now", updatedAt: "now" }])).toBe(true);
  });
});
