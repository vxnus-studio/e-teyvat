import { parse } from "yaml";

export type RawBannerDate = {
  start: string;
  end: string;
};

export type RawBannerCharacter = {
  name: string;
  versions: string[];
  dates: RawBannerDate[];
};

export type RawBannerData = {
  fiveStarCharacters: RawBannerCharacter[];
  fourStarCharacters: RawBannerCharacter[];
  standardCharacters: unknown[];
};

export type ParsedPhase = {
  phaseKey: string;
  version: string;
  phaseNumber: number;
  startDate: Date;
  endDate: Date;
  sequenceIndex: number;
  originalVersionString: string;
};

export type ParsedAppearance = {
  phaseKey: string;
  characterName: string;
  rarity: number;
};

export function parseBannersYaml(yamlContent: string) {
  const data = parse(yamlContent) as RawBannerData;

  const phaseMap = new Map<string, Omit<ParsedPhase, "sequenceIndex">>();
  const appearances: ParsedAppearance[] = [];

  const processCharacters = (characters: RawBannerCharacter[], rarity: number) => {
    if (!characters) return;
    for (const char of characters) {
      if (!char.versions || !char.dates) continue;
      
      for (let i = 0; i < char.versions.length; i++) {
        const versionString = char.versions[i];
        const dateObj = char.dates[i];
        
        if (!versionString || !dateObj || !dateObj.start || !dateObj.end) continue;
        
        // Parse version string (e.g., "1.0.1", "Luna V.1")
        // We assume the last part after the last dot is the phase number.
        const lastDotIdx = versionString.lastIndexOf(".");
        let version = versionString;
        let phaseNumber = 1;
        
        if (lastDotIdx !== -1) {
          version = versionString.substring(0, lastDotIdx);
          const phaseStr = versionString.substring(lastDotIdx + 1);
          const parsedPhase = parseInt(phaseStr, 10);
          if (!isNaN(parsedPhase)) {
            phaseNumber = parsedPhase;
          } else {
            version = versionString; // fallback if not a number
          }
        }
        
        const phaseKey = `genshin:${version}:${phaseNumber}`;
        const startDate = new Date(dateObj.start + "T00:00:00Z");
        const endDate = new Date(dateObj.end + "T00:00:00Z");

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
           continue; // skip invalid dates
        }
        
        if (!phaseMap.has(phaseKey)) {
          phaseMap.set(phaseKey, {
            phaseKey,
            version,
            phaseNumber,
            startDate,
            endDate,
            originalVersionString: versionString,
          });
        }
        
        appearances.push({
          phaseKey,
          characterName: char.name,
          rarity,
        });
      }
    }
  };

  processCharacters(data.fiveStarCharacters, 5);
  processCharacters(data.fourStarCharacters, 4);

  // Sort phases by start date to assign sequenceIndex
  const phases = Array.from(phaseMap.values()).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  const sequencedPhases: ParsedPhase[] = phases.map((p, index) => ({
    ...p,
    sequenceIndex: index + 1,
  }));

  return {
    phases: sequencedPhases,
    appearances,
  };
}
