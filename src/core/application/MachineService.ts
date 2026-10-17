import { MachineComponentSnapshot, MachineRuleViolation, MachineSnapshot, validateComponent, validateMachine } from '../domain/Machine';
import { closeDowntime, MachineDowntimeSnapshot, MachineOperationalEvent, openDowntime } from '../domain/Operations';
import { UnitOfWork } from './ports';

export interface MachineRepository {
  getAll(): Promise<MachineSnapshot[]>; getById(id: string): Promise<MachineSnapshot | null>; create(machine: MachineSnapshot): Promise<void>;
  getComponents(machineId: string): Promise<MachineComponentSnapshot[]>; createComponent(component: MachineComponentSnapshot): Promise<void>; updateComponent(component: MachineComponentSnapshot, expectedVersion: number): Promise<void>;
  changeOperationalStatus(machineId: string, status: MachineSnapshot['operationalStatus'], expectedVersion: number, updatedAt: string): Promise<MachineSnapshot>;
  getDowntime(id: string): Promise<MachineDowntimeSnapshot | null>; listDowntimes(machineId: string): Promise<MachineDowntimeSnapshot[]>; createDowntime(downtime: MachineDowntimeSnapshot): Promise<void>; updateDowntime(downtime: MachineDowntimeSnapshot, expectedVersion: number): Promise<void>;
}
export interface MachineHistoryRepository { append(events: MachineOperationalEvent[]): Promise<void>; }
export class MachineService {
  constructor(private readonly machines: MachineRepository, private readonly history?: MachineHistoryRepository, private readonly uow?: UnitOfWork) {}
  list(): Promise<MachineSnapshot[]> { return this.machines.getAll(); }
  async components(machineId: string): Promise<MachineComponentSnapshot[]> { return this.machines.getComponents(machineId); }
  downtimes(machineId: string): Promise<MachineDowntimeSnapshot[]> { return this.machines.listDowntimes(machineId); }
  async seed(machines: MachineSnapshot[], components: MachineComponentSnapshot[]): Promise<void> {
    for (const machine of machines) if (!await this.machines.getById(machine.id)) await this.machines.create(machine);
    for (const component of components) if (!(await this.machines.getComponents(component.machineId)).some(item => item.id === component.id)) await this.machines.createComponent(component);
  }
  async addComponent(component: MachineComponentSnapshot): Promise<void> {
    validateComponent(component);
    if (!await this.machines.getById(component.machineId)) throw new MachineRuleViolation('A máquina do componente não existe.');
    if (component.parentComponentId && !(await this.machines.getComponents(component.machineId)).some(item => item.id === component.parentComponentId)) throw new MachineRuleViolation('O componente pai deve pertencer à mesma máquina.');
    await this.machines.createComponent(component);
  }
  async updateComponent(component: MachineComponentSnapshot, expectedVersion: number): Promise<void> { validateComponent(component); await this.machines.updateComponent(component, expectedVersion); }
  async create(machine: MachineSnapshot): Promise<void> { validateMachine(machine); await this.machines.create(machine); }
  async changeOperationalStatus(machineId: string, status: MachineSnapshot['operationalStatus'], version: number, reason?: string): Promise<MachineSnapshot> {
    const operation = async () => {
      const machine = await this.machines.getById(machineId);
      if (!machine) throw new MachineRuleViolation('Máquina não encontrada.');
      if (machine.lifecycleStatus !== 'active') throw new MachineRuleViolation('Apenas máquinas ativas podem receber estado operacional.');
      if (status === 'fault' && !reason?.trim()) throw new MachineRuleViolation('Informe o motivo para o estado de falha.');
      const updated = await this.machines.changeOperationalStatus(machineId, status, version, new Date().toISOString());
      await this.history?.append([{ type: 'MachineOperationalStatusChanged', machineId, occurredAt: updated.updatedAt, previousStatus: machine.operationalStatus, nextStatus: status, reason }]);
      return updated;
    };
    return this.uow ? this.uow.transaction(operation) : operation();
  }
  async startDowntime(input: Omit<MachineDowntimeSnapshot, 'endedAt' | 'createdAt' | 'updatedAt' | 'version'>): Promise<MachineDowntimeSnapshot> {
    const operation = async () => { const downtime = openDowntime(input); if (!await this.machines.getById(downtime.machineId)) throw new MachineRuleViolation('Máquina não encontrada.'); if ((await this.machines.listDowntimes(downtime.machineId)).some(item => !item.endedAt)) throw new MachineRuleViolation('Já existe uma parada aberta para esta máquina. Encerre-a antes de iniciar outra.'); await this.machines.createDowntime(downtime); await this.history?.append([{ type: 'DowntimeOpened', machineId: downtime.machineId, occurredAt: downtime.startedAt, reason: downtime.reason }]); return downtime; };
    return this.uow ? this.uow.transaction(operation) : operation();
  }
  async finishDowntime(id: string, endedAt: string): Promise<MachineDowntimeSnapshot> {
    const operation = async () => { const current = await this.machines.getDowntime(id); if (!current) throw new MachineRuleViolation('Parada não encontrada.'); const closed = closeDowntime(current, endedAt); await this.machines.updateDowntime(closed, current.version); await this.history?.append([{ type: 'DowntimeClosed', machineId: closed.machineId, occurredAt: endedAt, reason: closed.reason }]); return closed; };
    return this.uow ? this.uow.transaction(operation) : operation();
  }
}
