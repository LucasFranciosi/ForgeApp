import { MachineOperationalStatus, MachineRuleViolation } from './Machine';

export type DowntimeType = 'planned' | 'unplanned';
export type MachineDowntimeSnapshot = {
  id: string; machineId: string; workOrderId?: string; type: DowntimeType; reason?: string;
  startedAt: string; endedAt?: string; createdAt: string; updatedAt: string; version: number;
};
export type MachineOperationalEvent = {
  type: 'MachineOperationalStatusChanged' | 'DowntimeOpened' | 'DowntimeClosed';
  machineId: string; occurredAt: string; previousStatus?: MachineOperationalStatus; nextStatus?: MachineOperationalStatus; reason?: string;
};
export function openDowntime(input: Omit<MachineDowntimeSnapshot, 'endedAt' | 'createdAt' | 'updatedAt' | 'version'>, now = new Date().toISOString()): MachineDowntimeSnapshot {
  if (!input.machineId || Number.isNaN(Date.parse(input.startedAt))) throw new MachineRuleViolation('Máquina e início válido são obrigatórios para a parada.');
  return { ...input, createdAt: now, updatedAt: now, version: 1 };
}
export function closeDowntime(downtime: MachineDowntimeSnapshot, endedAt: string): MachineDowntimeSnapshot {
  if (downtime.endedAt) throw new MachineRuleViolation('A parada já foi encerrada.');
  if (Number.isNaN(Date.parse(endedAt)) || Date.parse(endedAt) <= Date.parse(downtime.startedAt)) throw new MachineRuleViolation('O fim da parada deve ser posterior ao início.');
  return { ...downtime, endedAt, updatedAt: new Date().toISOString(), version: downtime.version + 1 };
}
