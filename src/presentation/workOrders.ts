import { WorkOrderSnapshot } from '../core/domain/WorkOrder';
import { Priority, WorkOrder } from '../types';

const typeToDomain = { Corretiva: 'corrective', Preventiva: 'preventive', 'Inspeção': 'inspection' } as const;
const priorityToDomain = { Crítica: 'critical', Alta: 'high', Média: 'normal', Baixa: 'low' } as const;
const priorityFromDomain: Record<WorkOrderSnapshot['priority'], Priority> = { critical: 'Crítica', high: 'Alta', normal: 'Média', low: 'Baixa' };
const typeFromDomain: Record<WorkOrderSnapshot['type'], WorkOrder['type']> = { corrective: 'Corretiva', preventive: 'Preventiva', inspection: 'Inspeção' };

export function toWorkOrderView(order: WorkOrderSnapshot): WorkOrder {
  const status: Record<WorkOrderSnapshot['status'], WorkOrder['status']> = {
    open: 'Aberta', scheduled: 'Planejada', inProgress: 'Pronta para encerrar', paused: 'Em execução', completed: 'Encerrada', cancelled: 'Encerrada',
  };
  return {
    id: order.id, machineId: order.machineId, title: order.title, type: typeFromDomain[order.type], priority: priorityFromDomain[order.priority],
    status: status[order.status], specialty: order.discipline === 'mechanical' ? 'Mecânica' : order.discipline === 'electrical' ? 'Elétrica' : 'Mista',
    duration: '—', description: order.description ?? '', progress: order.status === 'completed' ? 100 : order.status === 'inProgress' ? 85 : order.status === 'scheduled' ? 45 : 15,
    version: order.version, domainStatus: order.status,
    scheduledAt: order.scheduledAt,
  };
}

export function fromWorkOrderView(order: WorkOrder): WorkOrderSnapshot {
  const now = new Date().toISOString();
  const domainStatus: WorkOrderSnapshot['status'] = order.status === 'Planejada' ? 'scheduled' : order.status === 'Pronta para encerrar' ? 'inProgress' : order.status === 'Encerrada' ? 'completed' : 'open';
  return {
    id: order.id, machineId: order.machineId, code: order.id, title: order.title, description: order.description,
    type: typeToDomain[order.type], discipline: order.specialty.toLowerCase().includes('elétr') ? 'electrical' : order.specialty.toLowerCase().includes('mec') ? 'mechanical' : 'mixed',
    priority: priorityToDomain[order.priority], status: domainStatus, version: order.version ?? 1, createdAt: now, updatedAt: now,
    startedAt: domainStatus === 'inProgress' ? now : undefined, completedAt: domainStatus === 'completed' ? now : undefined,
    requiresPhoto: domainStatus === 'inProgress', requiresSignature: domainStatus === 'inProgress', hasPhoto: false, hasSignature: false, actions: [],
  };
}

export { priorityToDomain, typeToDomain };
