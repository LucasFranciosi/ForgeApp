import { MachineRuleViolation } from './Machine';

export type ScheduleExceptionType = 'holiday' | 'factoryShutdown' | 'plannedStop' | 'extraShift' | 'reducedShift' | 'maintenanceWindow';
export type OperationType = 'productive' | 'idle' | 'setup' | 'plannedStop' | 'unplannedStop' | 'maintenance';
export type WorkScheduleSnapshot = { id: string; machineId: string; effectiveFrom: string; effectiveTo?: string; minutes: [number, number, number, number, number, number, number]; createdAt: string; updatedAt: string; version: number };
export type ScheduleExceptionSnapshot = { id: string; machineId: string; startsAt: string; endsAt: string; type: ScheduleExceptionType; plannedMinutes?: number; reason?: string; createdAt: string; updatedAt: string };
export type OperationPeriodSnapshot = { id: string; machineId: string; startedAt: string; endedAt?: string; type: OperationType; notes?: string; createdAt: string };
export type WorkShiftSnapshot = { id:string; machineId:string; effectiveFrom:string; effectiveTo?:string; weekday:0|1|2|3|4|5|6; startsAtLocal:string; endsAtLocal:string; crossesMidnight:boolean; createdAt:string; updatedAt:string; version:number };
export type TelemetryMetric = 'vibration' | 'temperature' | 'current';
export type TelemetryReadingSnapshot = { id:string; machineId:string; metric:TelemetryMetric; value:number; unit:string; measuredAt:string; notes?:string; createdAt:string };

export function validateShift(shift: WorkShiftSnapshot): void {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.startsAtLocal) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.endsAtLocal)) throw new MachineRuleViolation('Os horários do turno devem usar o formato HH:mm.');
  if (shift.startsAtLocal === shift.endsAtLocal) throw new MachineRuleViolation('Um turno não pode ter início e fim iguais.');
  if (shift.crossesMidnight !== (shift.endsAtLocal < shift.startsAtLocal)) throw new MachineRuleViolation('Informe corretamente se o turno atravessa a meia-noite.');
  if (shift.effectiveTo && shift.effectiveTo < shift.effectiveFrom) throw new MachineRuleViolation('Fim da vigência do turno inválido.');
}

export function shiftMinutes(shift: Pick<WorkShiftSnapshot, 'startsAtLocal'|'endsAtLocal'|'crossesMidnight'>): number {
  const toMinutes = (value:string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
  const start = toMinutes(shift.startsAtLocal); const end = toMinutes(shift.endsAtLocal);
  return (shift.crossesMidnight ? end + 1440 : end) - start;
}

/** Intersects an ISO interval with a local UTC shift occurrence.  The app stores
 * operational timestamps in ISO/UTC, while shift clock values remain portable. */
export function shiftWindow(date:string, shift:Pick<WorkShiftSnapshot,'startsAtLocal'|'endsAtLocal'|'crossesMidnight'>) {
  const start = `${date}T${shift.startsAtLocal}:00.000Z`;
  const endDate = shift.crossesMidnight ? new Date(`${date}T00:00:00.000Z` + 86400000).toISOString().slice(0,10) : date;
  return { startsAt:start, endsAt:`${endDate}T${shift.endsAtLocal}:00.000Z` };
}

export function validateSchedule(schedule: WorkScheduleSnapshot): void {
  if (schedule.minutes.some(minutes => !Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) throw new MachineRuleViolation('Cada dia da jornada deve ter entre 0 e 1440 minutos.');
  if (schedule.effectiveTo && schedule.effectiveTo < schedule.effectiveFrom) throw new MachineRuleViolation('O fim da vigência deve ser posterior ao início.');
}
export function overlaps(startA: string, endA: string | undefined, startB: string, endB: string | undefined): boolean { return startA <= (endB ?? '9999-12-31') && startB <= (endA ?? '9999-12-31'); }
export function overlapMinutes(startA: string, endA: string, startB: string, endB: string): number { return Math.max(0, Math.min(Date.parse(endA), Date.parse(endB)) - Math.max(Date.parse(startA), Date.parse(startB))) / 60000; }
export function dayWindow(date: string): { startsAt: string; endsAt: string } { return { startsAt: `${date}T00:00:00.000Z`, endsAt: `${date}T23:59:59.999Z` }; }
