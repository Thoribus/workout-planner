export function roundWeightKg(weightKg: number, incrementKg: number): number {
  return Math.round(weightKg / incrementKg) * incrementKg;
}

export function calculateSetWeight(
  trainingMaxKg: number,
  percent: number,
  roundingIncrementKg: number,
): number {
  return roundWeightKg(trainingMaxKg * percent, roundingIncrementKg);
}

export function getSpeedCleanTrainingMax(cleanMaxKg: number, reductionKg: number): number {
  return Math.max(0, cleanMaxKg - reductionKg);
}

export function getFrontSquatTrainingMax(squatMaxKg: number, reductionKg: number): number {
  return Math.max(0, squatMaxKg - reductionKg);
}
