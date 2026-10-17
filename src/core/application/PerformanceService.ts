import { MachineRuleViolation } from '../domain/Machine';
import { dayWindow, OperationPeriodSnapshot, overlapMinutes, overlaps, ScheduleExceptionSnapshot, TelemetryReadingSnapshot, WorkScheduleSnapshot, WorkShiftSnapshot, validateSchedule, validateShift, shiftWindow } from '../domain/Schedule';
import { calculatePerformance, PerformanceResult } from '../domain/Performance';

export type DailyPerformance = PerformanceResult & { machineId: string; date: string; calculatedAt: string; calculationVersion: number };
export interface ScheduleRepository {
  schedules(machineId: string): Promise<WorkScheduleSnapshot[]>; saveSchedule(schedule: WorkScheduleSnapshot): Promise<void>;
  exceptions(machineId: string, startsAt: string, endsAt: string): Promise<ScheduleExceptionSnapshot[]>;
  operations(machineId: string, startsAt: string, endsAt: string): Promise<OperationPeriodSnapshot[]>;
  downtimes(machineId: string, startsAt: string, endsAt: string): Promise<{ startedAt: string; endedAt?: string; type: 'planned' | 'unplanned' }[]>;
  saveDailyPerformance(performance: DailyPerformance): Promise<void>; saveOperation(period: OperationPeriodSnapshot): Promise<void>;
  saveException(exception:ScheduleExceptionSnapshot):Promise<void>;
  shifts(machineId:string):Promise<WorkShiftSnapshot[]>; saveShift(shift:WorkShiftSnapshot):Promise<void>;
  saveTelemetry(reading:TelemetryReadingSnapshot):Promise<void>; telemetry(machineId:string, metric?:TelemetryReadingSnapshot['metric']):Promise<TelemetryReadingSnapshot[]>;
}
export class PerformanceService {
  constructor(private readonly repository: ScheduleRepository) {}
  async setSchedule(schedule: WorkScheduleSnapshot): Promise<void> {
    validateSchedule(schedule);
    const existing = await this.repository.schedules(schedule.machineId);
    if (existing.some(item => item.id !== schedule.id && overlaps(item.effectiveFrom, item.effectiveTo, schedule.effectiveFrom, schedule.effectiveTo))) throw new MachineRuleViolation('Não é permitido sobrepor vigências de jornada.');
    await this.repository.saveSchedule(schedule);
  }
  async addException(exception:ScheduleExceptionSnapshot):Promise<void>{if(!exception.machineId||Date.parse(exception.endsAt)<=Date.parse(exception.startsAt))throw new MachineRuleViolation('O fim da exceção deve ser posterior ao início.');await this.repository.saveException(exception);}
  async addOperation(period: OperationPeriodSnapshot): Promise<void> {
    if (!period.machineId || Number.isNaN(Date.parse(period.startedAt)) || (period.endedAt && Date.parse(period.endedAt) <= Date.parse(period.startedAt))) throw new MachineRuleViolation('Informe uma máquina e um período operacional válido.');
    const end = period.endedAt ?? '9999-12-31T23:59:59.999Z';
    const existing = await this.repository.operations(period.machineId, period.startedAt, end);
    if (existing.some(item => item.type === period.type && overlaps(item.startedAt, item.endedAt, period.startedAt, period.endedAt))) throw new MachineRuleViolation('Já existe um período do mesmo tipo que se sobrepõe a este intervalo.');
    await this.repository.saveOperation(period);
  }
  async setShift(shift:WorkShiftSnapshot):Promise<void>{
    validateShift(shift);
    const existing=await this.repository.shifts(shift.machineId);
    if(existing.some(item=>item.id!==shift.id&&item.weekday===shift.weekday&&overlaps(item.effectiveFrom,item.effectiveTo,shift.effectiveFrom,shift.effectiveTo)&&overlaps(item.startsAtLocal,item.endsAtLocal,shift.startsAtLocal,shift.endsAtLocal))) throw new MachineRuleViolation('Não é permitido sobrepor faixas de turno na mesma vigência.');
    await this.repository.saveShift(shift);
  }
  async recordTelemetry(reading:TelemetryReadingSnapshot):Promise<void>{
    if(!reading.machineId||!Number.isFinite(reading.value)||!reading.unit.trim()||Number.isNaN(Date.parse(reading.measuredAt))) throw new MachineRuleViolation('Leitura manual inválida.');
    await this.repository.saveTelemetry(reading);
  }
  telemetry(machineId:string,metric?:TelemetryReadingSnapshot['metric']){return this.repository.telemetry(machineId,metric);}
  async calculateDay(machineId: string, date: string): Promise<DailyPerformance> {
    const schedule = (await this.repository.schedules(machineId)).find(item => item.effectiveFrom <= date && (!item.effectiveTo || item.effectiveTo >= date));
    const { startsAt, endsAt } = dayWindow(date);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    let plannedMinutes = schedule?.minutes[(weekday + 6) % 7] ?? 0;
    const shifts=(await this.repository.shifts(machineId)).filter(shift=>shift.effectiveFrom<=date&&(!shift.effectiveTo||shift.effectiveTo>=date)&&shift.weekday===weekday);
    if(shifts.length) plannedMinutes=shifts.reduce((sum,shift)=>sum+overlapMinutes(shiftWindow(date,shift).startsAt,shiftWindow(date,shift).endsAt,startsAt,endsAt),0);
    const exceptions = await this.repository.exceptions(machineId, startsAt, endsAt);
    for (const exception of exceptions) {
      if (exception.type === 'holiday' || exception.type === 'factoryShutdown') plannedMinutes = 0;
      if (exception.type === 'extraShift') plannedMinutes += exception.plannedMinutes ?? overlapMinutes(exception.startsAt, exception.endsAt, startsAt, endsAt);
      if (exception.type === 'reducedShift') plannedMinutes = exception.plannedMinutes ?? plannedMinutes;
    }
    const [operations, downtimes] = await Promise.all([this.repository.operations(machineId, startsAt, endsAt), this.repository.downtimes(machineId, startsAt, endsAt)]);
    const duration = (start: string, end?: string) => overlapMinutes(start, end ?? endsAt, startsAt, endsAt);
    const productiveMinutes = operations.filter(item => item.type === 'productive').reduce((sum, item) => sum + duration(item.startedAt, item.endedAt), 0);
    const operatingMinutes = operations.filter(item => item.type === 'productive' || item.type === 'idle' || item.type === 'setup').reduce((sum, item) => sum + duration(item.startedAt, item.endedAt), 0);
    const plannedDowntimeMinutes = downtimes.filter(item => item.type === 'planned').reduce((sum, item) => sum + duration(item.startedAt, item.endedAt), 0);
    const unplannedDowntimeMinutes = downtimes.filter(item => item.type === 'unplanned').reduce((sum, item) => sum + duration(item.startedAt, item.endedAt), 0);
    const productive=operations.filter(item=>item.type==='productive');
    const scheduledProductive=shifts.length ? productive.reduce((sum,item)=>sum+shifts.reduce((inner,shift)=>{const window=shiftWindow(date,shift);return inner+overlapMinutes(item.startedAt,item.endedAt??endsAt,window.startsAt,window.endsAt)},0),0) : Math.min(productiveMinutes,plannedMinutes);
    const extraMinutes=Math.max(0,productiveMinutes-scheduledProductive);
    const calculated = calculatePerformance({ plannedMinutes, plannedDowntimeMinutes, unplannedDowntimeMinutes, productiveMinutes, operatingMinutes, extraMinutes });
    const result = { ...calculated, machineId, date, calculatedAt: new Date().toISOString(), calculationVersion: 1 };
    await this.repository.saveDailyPerformance(result); return result;
  }
}
