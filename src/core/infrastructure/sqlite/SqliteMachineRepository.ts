import { MachineComponentSnapshot, MachineSnapshot } from '../../domain/Machine';
import { MachineRepository } from '../../application/MachineService';
import { ConcurrencyConflict } from '../../application/ports';
import { forgeDatabase } from './ForgeDatabase';
import { MachineDowntimeSnapshot, MachineOperationalEvent } from '../../domain/Operations';
import { MachineHistoryRepository } from '../../application/MachineService';

export class SqliteMachineRepository implements MachineRepository {
  async getAll(): Promise<MachineSnapshot[]> { return (await (await forgeDatabase()).getAllAsync<MachineSnapshot>('SELECT * FROM machine ORDER BY code')); }
  async getById(id: string): Promise<MachineSnapshot | null> { return (await (await forgeDatabase()).getFirstAsync<MachineSnapshot>('SELECT * FROM machine WHERE id = ?', [id])) ?? null; }
  async create(machine: MachineSnapshot): Promise<void> {
    const db = await forgeDatabase();
    await db.runAsync('INSERT INTO machine (id,plantId,sectorId,sectorName,code,name,description,manufacturer,model,serialNumber,machineType,lifecycleStatus,operationalStatus,createdAt,updatedAt,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [machine.id,machine.plantId,machine.sectorId ?? null,machine.sectorName ?? null,machine.code,machine.name,machine.description ?? null,machine.manufacturer ?? null,machine.model ?? null,machine.serialNumber ?? null,machine.machineType ?? null,machine.lifecycleStatus,machine.operationalStatus,machine.createdAt,machine.updatedAt,machine.version]);
  }
  async getComponents(machineId: string): Promise<MachineComponentSnapshot[]> { return (await (await forgeDatabase()).getAllAsync<MachineComponentSnapshot>('SELECT * FROM machineComponent WHERE machineId = ? ORDER BY name', [machineId])); }
  async createComponent(component: MachineComponentSnapshot): Promise<void> {
    const db = await forgeDatabase();
    await db.runAsync('INSERT INTO machineComponent (id,machineId,parentComponentId,code,name,componentType,description,discipline,isCritical,status,createdAt,updatedAt,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [component.id,component.machineId,component.parentComponentId ?? null,component.code ?? null,component.name,component.componentType ?? null,component.description ?? null,component.discipline,Number(component.isCritical),component.status,component.createdAt,component.updatedAt,component.version]);
  }
  async updateComponent(component: MachineComponentSnapshot, expectedVersion: number): Promise<void> {
    const db = await forgeDatabase(); const result = await db.runAsync('UPDATE machineComponent SET name=?,description=?,componentType=?,discipline=?,isCritical=?,status=?,updatedAt=?,version=? WHERE id=? AND machineId=? AND version=?', [component.name,component.description ?? null,component.componentType ?? null,component.discipline,Number(component.isCritical),component.status,component.updatedAt,component.version,component.id,component.machineId,expectedVersion]);
    if (result.changes !== 1) throw new ConcurrencyConflict();
  }
  async changeOperationalStatus(machineId: string, status: MachineSnapshot['operationalStatus'], expectedVersion: number, updatedAt: string): Promise<MachineSnapshot> {
    const db = await forgeDatabase(); const result = await db.runAsync('UPDATE machine SET operationalStatus=?, updatedAt=?, version=version+1 WHERE id=? AND version=?', [status, updatedAt, machineId, expectedVersion]);
    if (result.changes !== 1) throw new ConcurrencyConflict();
    const updated = await this.getById(machineId); if (!updated) throw new Error('Máquina não encontrada após atualização.'); return updated;
  }
  async getDowntime(id: string): Promise<MachineDowntimeSnapshot | null> { return (await (await forgeDatabase()).getFirstAsync<MachineDowntimeSnapshot>('SELECT * FROM machineDowntime WHERE id = ?', [id])) ?? null; }
  async listDowntimes(machineId: string): Promise<MachineDowntimeSnapshot[]> { return (await (await forgeDatabase()).getAllAsync<MachineDowntimeSnapshot>('SELECT * FROM machineDowntime WHERE machineId=? ORDER BY startedAt DESC', [machineId])); }
  async createDowntime(downtime: MachineDowntimeSnapshot): Promise<void> { await (await forgeDatabase()).runAsync('INSERT INTO machineDowntime (id,machineId,workOrderId,type,reason,startedAt,endedAt,createdAt,updatedAt,version) VALUES (?,?,?,?,?,?,?,?,?,?)', [downtime.id,downtime.machineId,downtime.workOrderId ?? null,downtime.type,downtime.reason ?? null,downtime.startedAt,downtime.endedAt ?? null,downtime.createdAt,downtime.updatedAt,downtime.version]); }
  async updateDowntime(downtime: MachineDowntimeSnapshot, expectedVersion: number): Promise<void> { const result = await (await forgeDatabase()).runAsync('UPDATE machineDowntime SET endedAt=?,updatedAt=?,version=? WHERE id=? AND version=?', [downtime.endedAt ?? null,downtime.updatedAt,downtime.version,downtime.id,expectedVersion]); if (result.changes !== 1) throw new ConcurrencyConflict(); }
}

export class SqliteMachineHistoryRepository implements MachineHistoryRepository {
  async append(events: MachineOperationalEvent[]): Promise<void> {
    const db = await forgeDatabase();
    for (const event of events) await db.runAsync('INSERT INTO machineHistory (machineId,eventType,occurredAt,previousStatus,nextStatus,reason) VALUES (?,?,?,?,?,?)', [event.machineId,event.type,event.occurredAt,event.previousStatus ?? null,event.nextStatus ?? null,event.reason ?? null]);
  }
}
