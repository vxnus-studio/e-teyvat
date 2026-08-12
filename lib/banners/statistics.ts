export type CharacterIntervalData = {
  characterId: number;
  appearancePhaseIndices: number[];
  intervals: number[];
  appearanceCount: number;
  completedIntervalCount: number;
  currentWait: number;
  meanInterval: number | null;
  medianInterval: number | null;
  minimumInterval: number | null;
  maximumInterval: number | null;
  modeIntervals: number[];
  currentWaitPercentile: number | null;
};

export function calculateCharacterStatistics(
  characterId: number,
  appearanceIndices: number[],
  latestKnownSequenceIndex: number
): CharacterIntervalData {
  const sortedIndices = [...appearanceIndices].sort((a, b) => a - b);
  const intervals: number[] = [];
  
  for (let i = 1; i < sortedIndices.length; i++) {
    intervals.push(sortedIndices[i] - sortedIndices[i - 1]);
  }

  const appearanceCount = sortedIndices.length;
  const completedIntervalCount = intervals.length;
  const lastAppearanceIndex = sortedIndices.length > 0 ? sortedIndices[sortedIndices.length - 1] : 0;
  
  const currentWait = sortedIndices.length > 0 ? Math.max(0, latestKnownSequenceIndex - lastAppearanceIndex) : 0;

  if (completedIntervalCount === 0) {
    return {
      characterId,
      appearancePhaseIndices: sortedIndices,
      intervals,
      appearanceCount,
      completedIntervalCount,
      currentWait,
      meanInterval: null,
      medianInterval: null,
      minimumInterval: null,
      maximumInterval: null,
      modeIntervals: [],
      currentWaitPercentile: null,
    };
  }

  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const sum = intervals.reduce((acc, val) => acc + val, 0);
  const meanInterval = sum / completedIntervalCount;
  
  let medianInterval: number;
  const mid = Math.floor(completedIntervalCount / 2);
  if (completedIntervalCount % 2 === 0) {
    medianInterval = (sortedIntervals[mid - 1] + sortedIntervals[mid]) / 2;
  } else {
    medianInterval = sortedIntervals[mid];
  }

  const minimumInterval = sortedIntervals[0];
  const maximumInterval = sortedIntervals[completedIntervalCount - 1];

  const counts = new Map<number, number>();
  let maxCount = 0;
  for (const interval of intervals) {
    const c = (counts.get(interval) || 0) + 1;
    counts.set(interval, c);
    if (c > maxCount) maxCount = c;
  }

  const modeIntervals = Array.from(counts.entries())
    .filter(([_, count]) => count === maxCount)
    .map(([val]) => val)
    .sort((a, b) => a - b);

  // currentWaitPercentile: percentage of historical intervals that are <= currentWait
  const intervalsBelowOrEqual = intervals.filter(i => i <= currentWait).length;
  const currentWaitPercentile = (intervalsBelowOrEqual / completedIntervalCount) * 100;

  return {
    characterId,
    appearancePhaseIndices: sortedIndices,
    intervals,
    appearanceCount,
    completedIntervalCount,
    currentWait,
    meanInterval,
    medianInterval,
    minimumInterval,
    maximumInterval,
    modeIntervals,
    currentWaitPercentile,
  };
}
