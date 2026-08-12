import { describe, it, expect } from "bun:test";
import { parseBannersYaml } from "../lib/banners/parser.ts";
import { calculateCharacterStatistics } from "../lib/banners/statistics.ts";
import { calculatePressureAndConfidence } from "../lib/banners/pressure-model.ts";

const mockYaml = `
fiveStarCharacters:
  - name: Bennett
    versions:
      - 1.0.1
      - 1.4.1
      - Luna V.1
    dates:
      - start: '2020-09-28'
        end: '2020-10-20'
      - start: '2021-03-17'
        end: '2021-04-06'
      - start: '2026-02-25'
        end: '2026-03-17'
fourStarCharacters:
  - name: Fischl
    versions:
      - 1.0.1
      - 1.2.2
    dates:
      - start: '2020-09-28'
        end: '2020-10-20'
      - start: '2021-01-12'
        end: '2021-02-03'
standardCharacters: []
`;

describe("Banner YAML Parser", () => {
  it("should parse phases correctly and assign continuous sequence indices", () => {
    const result = parseBannersYaml(mockYaml);
    expect(result.phases.length).toBe(4);
    
    // Ordered by start date
    expect(result.phases[0].version).toBe("1.0");
    expect(result.phases[0].sequenceIndex).toBe(1);
    
    expect(result.phases[1].version).toBe("1.2");
    expect(result.phases[1].sequenceIndex).toBe(2);
    
    expect(result.phases[2].version).toBe("1.4");
    expect(result.phases[2].sequenceIndex).toBe(3);
    
    expect(result.phases[3].version).toBe("Luna V");
    expect(result.phases[3].sequenceIndex).toBe(4);
  });

  it("should parse non-standard version labels like Luna V.1", () => {
    const result = parseBannersYaml(mockYaml);
    const luna = result.phases.find(p => p.phaseKey === "genshin:Luna V:1");
    expect(luna).toBeDefined();
    expect(luna?.version).toBe("Luna V");
  });

  it("should properly extract character appearances", () => {
    const result = parseBannersYaml(mockYaml);
    expect(result.appearances.length).toBe(5);
    const bennettApps = result.appearances.filter(a => a.characterName === "Bennett");
    expect(bennettApps.length).toBe(3);
    expect(bennettApps[0].rarity).toBe(5); // In mock it's under fiveStarCharacters
  });
});

describe("Banner Interval Statistics", () => {
  it("should calculate completed intervals correctly", () => {
    const stats = calculateCharacterStatistics(1, [100, 106, 113], 119);
    expect(stats.appearanceCount).toBe(3);
    expect(stats.completedIntervalCount).toBe(2);
    expect(stats.intervals).toEqual([6, 7]);
    expect(stats.currentWait).toBe(6);
    expect(stats.meanInterval).toBe(6.5);
    expect(stats.medianInterval).toBe(6.5);
    expect(stats.minimumInterval).toBe(6);
    expect(stats.maximumInterval).toBe(7);
  });

  it("should handle characters with only one appearance", () => {
    const stats = calculateCharacterStatistics(1, [10], 15);
    expect(stats.appearanceCount).toBe(1);
    expect(stats.completedIntervalCount).toBe(0);
    expect(stats.intervals).toEqual([]);
    expect(stats.currentWait).toBe(5);
    expect(stats.meanInterval).toBeNull();
  });
  
  it("should handle characters with no completed intervals gracefully", () => {
    const stats = calculateCharacterStatistics(1, [], 10);
    expect(stats.appearanceCount).toBe(0);
    expect(stats.currentWait).toBe(0);
    expect(stats.meanInterval).toBeNull();
  });
});

describe("Banner Rerun Pressure Model", () => {
  it("should calculate pressure correctly based on global ranks and intervals", () => {
    const char1 = calculateCharacterStatistics(1, [1, 5, 10], 15); // Wait: 5, Intervals: [4, 5]
    const char2 = calculateCharacterStatistics(2, [2, 12], 15);    // Wait: 3, Intervals: [10]
    
    const results = calculatePressureAndConfidence([char1, char2]);
    expect(results.length).toBe(2);
    
    const r1 = results.find(r => r.characterId === 1);
    const r2 = results.find(r => r.characterId === 2);
    
    expect(r1?.pressureLevel).toBeDefined();
    expect(r2?.pressureLevel).toBeDefined();
    
    // char1 waits 5, rank is higher
    expect(r1!.pressureScore).toBeGreaterThan(r2!.pressureScore);
  });

  it("should return LOW confidence if limited history", () => {
    const char1 = calculateCharacterStatistics(1, [10], 15);
    const results = calculatePressureAndConfidence([char1]);
    expect(results[0].confidenceLevel).toBe("low");
    expect(results[0].pressureScore).toBe(0);
  });
});
