export type PerformanceInput = { plannedMinutes: number; plannedDowntimeMinutes: number; unplannedDowntimeMinutes: number; productiveMinutes: number; operatingMinutes: number; extraMinutes?: number; };
export type PerformanceResult = PerformanceInput & { availablePlannedMinutes: number; extraMinutes: number; availabilityPercent: number | null; efficiencyPercent: number | null; };

/** Percentages are recalculated from totals; callers must never average daily percentages. */
export function calculatePerformance(input: PerformanceInput): PerformanceResult {
  const availablePlannedMinutes = Math.max(0, input.plannedMinutes - input.plannedDowntimeMinutes);
  const availabilityPercent = availablePlannedMinutes === 0 ? null : ((availablePlannedMinutes - input.unplannedDowntimeMinutes) / availablePlannedMinutes) * 100;
  const efficiencyPercent = availablePlannedMinutes === 0 ? null : (input.productiveMinutes / availablePlannedMinutes) * 100;
  return { ...input, availablePlannedMinutes, extraMinutes: input.extraMinutes ?? 0, availabilityPercent, efficiencyPercent };
}
