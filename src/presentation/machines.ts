import { MachineComponentSnapshot, MachineSnapshot } from '../core/domain/Machine';
import { ComponentItem, Machine } from '../types';

const now = () => new Date().toISOString();
const disciplineForSystem = (system: ComponentItem['system']): MachineComponentSnapshot['discipline'] => system === 'Hidráulico' || system === 'Acionamento' ? 'mechanical' : 'electrical';
const systemForDiscipline = (discipline: MachineComponentSnapshot['discipline']): ComponentItem['system'] => discipline === 'electrical' ? 'Elétrica & sensores' : 'Acionamento';

export function machineSnapshot(machine: Machine): MachineSnapshot {
  const timestamp = now();
  return { id: machine.id, plantId: 'plant-demo', sectorName: machine.area, code: machine.id, name: machine.name, machineType: machine.type,
    lifecycleStatus: 'active', operationalStatus: machine.state === 'Parada' ? 'stopped' : machine.state === 'Atenção' ? 'fault' : 'running', createdAt: timestamp, updatedAt: timestamp, version: 1 };
}
export function componentSnapshot(machineId: string, component: ComponentItem): MachineComponentSnapshot {
  const timestamp = now();
  return { id: `${machineId}:${component.id}`, machineId, code: component.id, name: component.name, componentType: component.system, description: component.detail,
    discipline: disciplineForSystem(component.system), isCritical: !!component.warning, status: 'active', createdAt: timestamp, updatedAt: timestamp, version: 1 };
}
export function componentView(component: MachineComponentSnapshot): ComponentItem {
  return { id: component.id.split(':').pop() ?? component.id, name: component.name, system: component.componentType === 'Hidráulico' ? 'Hidráulico' : systemForDiscipline(component.discipline), detail: component.description ?? 'Sem descrição técnica', warning: component.isCritical ? 'Crítico' : undefined, specs: [component.discipline === 'electrical' ? 'Elétrico' : 'Mecânico', component.status === 'active' ? 'Ativo' : 'Inativo', 'Local'] };
}
export function machineView(machine: MachineSnapshot, components: MachineComponentSnapshot[]): Machine {
  const state: Machine['state'] = machine.operationalStatus === 'fault' ? 'Atenção' : machine.operationalStatus === 'running' ? 'Operando' : 'Parada';
  return { id: machine.id, name: machine.name, type: machine.machineType ?? 'Máquina industrial', line: machine.sectorName ?? 'Sem setor', area: machine.sectorName ?? 'Sem setor', state,
    downtime: '—', preventive: '—', docs: '—', components: components.map(componentView), version: machine.version };
}
