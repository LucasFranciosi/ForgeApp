export type MachineLifecycleStatus = 'active' | 'inactive' | 'decommissioned';
export type MachineOperationalStatus = 'running' | 'stopped' | 'setup' | 'maintenance' | 'fault';
export type MaintenanceDiscipline = 'mechanical' | 'electrical' | 'mixed';

export type MachineSnapshot = {
  id: string; plantId: string; sectorId?: string; sectorName?: string; code: string; name: string; description?: string;
  manufacturer?: string; model?: string; serialNumber?: string; machineType?: string;
  lifecycleStatus: MachineLifecycleStatus; operationalStatus: MachineOperationalStatus;
  createdAt: string; updatedAt: string; version: number;
};
export type MachineComponentSnapshot = {
  id: string; machineId: string; parentComponentId?: string; code?: string; name: string;
  componentType?: string; description?: string; discipline: MaintenanceDiscipline; isCritical: boolean;
  status: 'active' | 'inactive'; createdAt: string; updatedAt: string; version: number;
};
export class MachineRuleViolation extends Error { constructor(message: string) { super(message); this.name = 'MachineRuleViolation'; } }

export function validateMachine(input: MachineSnapshot): void {
  if (!input.code.trim() || !input.name.trim() || !input.plantId.trim()) throw new MachineRuleViolation('Código, nome e planta são obrigatórios.');
}
export function validateComponent(input: MachineComponentSnapshot): void {
  if (!input.machineId || !input.name.trim()) throw new MachineRuleViolation('Máquina e nome do componente são obrigatórios.');
  if (input.parentComponentId === input.id) throw new MachineRuleViolation('Um componente não pode ser seu próprio pai.');
}
