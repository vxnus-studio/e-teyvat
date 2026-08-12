import type { CharacterIntervalData } from "./statistics.ts";

export type Reason = {
  reasonCode: string;
  message: string;
  weight: number;
};

export type PressureResult = {
  characterId: number;
  pressureScore: number;
  pressureLevel: string;
  confidenceScore: number;
  confidenceLevel: string;
  reasons: Reason[];
};

function getPressureLevel(score: number): string {
  if (score < 25) return "low";
  if (score < 50) return "moderate";
  if (score < 70) return "elevated";
  if (score < 85) return "high";
  return "very_high";
}

function getConfidenceLevel(score: number): string {
  if (score < 33) return "low";
  if (score < 66) return "medium";
  return "high";
}

export function calculatePressureAndConfidence(
  allFourStarsData: CharacterIntervalData[],
): PressureResult[] {
  // Sort characters by current wait descending to determine global overdue ranking
  const sortedByWait = [...allFourStarsData].sort((a, b) => b.currentWait - a.currentWait);
  const waitRanks = new Map<number, number>();
  sortedByWait.forEach((data, index) => waitRanks.set(data.characterId, index));
  const totalEligible = sortedByWait.length;

  return allFourStarsData.map((data) => {
    const reasons: Reason[] = [];
    let pressureScore = 0;
    let confidenceScore = 0;

    if (data.completedIntervalCount === 0 || data.meanInterval === null || data.medianInterval === null) {
      return {
        characterId: data.characterId,
        pressureScore: 0,
        pressureLevel: "low",
        confidenceScore: 0,
        confidenceLevel: "low",
        reasons: [
          {
            reasonCode: "LIMITED_HISTORY",
            message: "Not enough historical data to calculate rerun pressure.",
            weight: 0,
          }
        ]
      };
    }

    // 1. Current Wait Percentile (40%)
    const cwPercentile = data.currentWaitPercentile ?? 0;
    pressureScore += cwPercentile * 0.4;
    
    if (cwPercentile >= 80) {
      reasons.push({
        reasonCode: "CURRENT_WAIT_ABOVE_TYPICAL",
        message: "The current wait is longer than most of this character's historical intervals.",
        weight: 0.4,
      });
    } else if (cwPercentile <= 20) {
      reasons.push({
        reasonCode: "CURRENT_WAIT_BELOW_TYPICAL",
        message: "The current wait is shorter than typical historical intervals.",
        weight: 0.4,
      });
    }

    // 2. Proximity to historical interval distribution (30%)
    // E.g., if wait matches median or mode closely.
    const medianDist = Math.abs(data.currentWait - data.medianInterval);
    let proximityScore = 0;
    if (medianDist <= 1) {
      proximityScore = 100;
      reasons.push({
        reasonCode: "CURRENT_WAIT_MATCHES_MEDIAN",
        message: "The current wait closely matches the character's historical median interval.",
        weight: 0.3,
      });
    } else if (medianDist <= 2) {
      proximityScore = 50;
      reasons.push({
        reasonCode: "CURRENT_WAIT_INSIDE_COMMON_RANGE",
        message: "The current wait is near the character's historical average interval.",
        weight: 0.15,
      });
    } else if (data.currentWait >= data.maximumInterval!) {
       proximityScore = 100;
       reasons.push({
        reasonCode: "CURRENT_WAIT_NEAR_PERSONAL_MAXIMUM",
        message: "The current wait has reached or exceeded their historical maximum interval.",
        weight: 0.3,
      });
    }
    pressureScore += proximityScore * 0.3;

    // 3. Global overdue ranking (20%)
    const rank = waitRanks.get(data.characterId) ?? 0;
    const rankPercentile = ((totalEligible - rank) / totalEligible) * 100;
    pressureScore += rankPercentile * 0.2;
    
    if (rankPercentile >= 80) {
      reasons.push({
        reasonCode: "FEW_CHARACTERS_MORE_OVERDUE",
        message: "Very few eligible four-star characters have been waiting longer.",
        weight: 0.2,
      });
    } else if (rankPercentile <= 20) {
      reasons.push({
        reasonCode: "MANY_CHARACTERS_MORE_OVERDUE",
        message: "Many other four-star characters are currently more overdue.",
        weight: 0.2,
      });
    }

    // 4. Recent rotation adjustment (10%)
    // Just give 10% baseline if they haven't appeared in the last 2 phases, else 0
    let recentAdj = 0;
    if (data.currentWait > 2) {
      recentAdj = 100;
    }
    pressureScore += recentAdj * 0.1;

    // Confidence Calculation
    // Base on sample size (up to 10 is max confidence from size)
    let sampleConfidence = Math.min((data.completedIntervalCount / 8) * 100, 100);
    
    // Variance penalty
    const variance = data.intervals.reduce((acc, val) => acc + Math.pow(val - data.meanInterval!, 2), 0) / data.completedIntervalCount;
    const stdDev = Math.sqrt(variance);
    let consistencyConfidence = 100 - (stdDev * 10);
    if (consistencyConfidence < 0) consistencyConfidence = 0;
    
    if (stdDev < 1.5 && data.completedIntervalCount > 3) {
      reasons.push({
        reasonCode: "STRONG_HISTORICAL_PATTERN",
        message: "This character has a very consistent historical rerun pattern.",
        weight: 0,
      });
    } else if (stdDev > 4) {
       reasons.push({
        reasonCode: "HIGH_INTERVAL_VARIANCE",
        message: "This character's rerun intervals have been highly unpredictable.",
        weight: 0,
      });
    }

    confidenceScore = (sampleConfidence * 0.6) + (consistencyConfidence * 0.4);

    return {
      characterId: data.characterId,
      pressureScore: Math.round(pressureScore),
      pressureLevel: getPressureLevel(pressureScore),
      confidenceScore: Math.round(confidenceScore),
      confidenceLevel: getConfidenceLevel(confidenceScore),
      reasons,
    };
  });
}
