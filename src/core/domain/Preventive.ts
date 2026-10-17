import { MachineRuleViolation } from './Machine';

export type FrequencyType = 'days' | 'weeks' | 'months' | 'operatingHours' | 'cycles';
export type PreventiveExecutionStatus = 'scheduled' | 'inProgress' | 'paused' | 'completed' | 'cancelled';
export type SectionStatus = 'pending' | 'inProgress' | 'completed' | 'blocked' | 'skipped';
export type ActionStatus = 'pending' | 'completed' | 'failed' | 'skipped';
export type PreventivePlanSnapshot = { id: string; machineId: string; name: string; description?: string; frequencyType: FrequencyType; frequencyValue: number; status: 'active' | 'inactive'; createdAt: string; updatedAt: string; version: number };
export type PreventiveSectionSnapshot = { id: string; planId: string; machineId: string; componentId?: string; name: string; discipline: 'mechanical' | 'electrical' | 'mixed'; sequence: number; isRequired: boolean; estimatedMinutes?: number };
export type PreventiveSectionActionSnapshot = { id:string; sectionId:string; description:string; instructions?:string; isRequired:boolean; sequence:number };
export type PreventiveActionExecution = { id: string; sectionExecutionId: string; isRequired: boolean; status: ActionStatus; notes?: string };
export type PreventiveSectionExecution = { id: string; sectionId: string; isRequired: boolean; status: SectionStatus; actions: PreventiveActionExecution[]; notes?: string };
export type PreventiveExecutionSnapshot = { id: string; machineId: string; planId: string; scheduledAt: string; status: PreventiveExecutionStatus; startedAt?: string; completedAt?: string; cancelledAt?: string; cancellationReason?: string; version: number; createdAt: string; updatedAt: string; sections: PreventiveSectionExecution[] };
export type PreventiveEvent = { type: 'PreventiveStarted' | 'PreventivePaused' | 'PreventiveSectionCompleted' | 'PreventiveCompleted' | 'PreventiveCancelled' | 'PreventiveActionFailed' | 'PreventiveSectionBlocked'; executionId: string; machineId: string; occurredAt: string; reason?: string };

export class PreventiveExecution {
  private events: PreventiveEvent[] = [];
  constructor(private state: PreventiveExecutionSnapshot) {}
  snapshot(): PreventiveExecutionSnapshot { return { ...this.state, sections: this.state.sections.map(section => ({ ...section, actions: [...section.actions] })) }; }
  pullEvents() { const events = this.events; this.events = []; return events; }
  start(now = new Date().toISOString()) { this.transition(['scheduled', 'paused'], 'inProgress', now, 'PreventiveStarted'); this.state.startedAt ??= now; }
  pause(now = new Date().toISOString()) { this.transition(['inProgress'], 'paused', now, 'PreventivePaused'); }
  cancel(reason: string, now = new Date().toISOString()) { if (!reason.trim()) throw new MachineRuleViolation('O motivo do cancelamento é obrigatório.'); this.state.cancellationReason = reason; this.state.cancelledAt = now; this.transition(['scheduled', 'inProgress', 'paused'], 'cancelled', now, 'PreventiveCancelled', reason); }
  completeSection(sectionExecutionId: string, now = new Date().toISOString()) {
    if (this.state.status !== 'inProgress') throw new MachineRuleViolation('A preventiva deve estar em execução.');
    const section = this.state.sections.find(item => item.id === sectionExecutionId); if (!section) throw new MachineRuleViolation('Seção não encontrada.');
    if (section.actions.some(action => action.isRequired && action.status !== 'completed')) throw new MachineRuleViolation('Ações obrigatórias da seção precisam estar concluídas.');
    section.status = 'completed'; this.touch(now); this.events.push({ type: 'PreventiveSectionCompleted', executionId: this.state.id, machineId: this.state.machineId, occurredAt: now });
  }
  completeAction(actionExecutionId: string, notes?: string, now = new Date().toISOString()) {
    this.recordAction(actionExecutionId, 'completed', notes, now);
  }
  recordAction(actionExecutionId: string, status: ActionStatus, notes?: string, now = new Date().toISOString()) {
    if (this.state.status !== 'inProgress') throw new MachineRuleViolation('A preventiva deve estar em execução.');
    const action = this.state.sections.flatMap(section => section.actions).find(item => item.id === actionExecutionId);
    if (!action) throw new MachineRuleViolation('Ação não encontrada.');
    if (status === 'failed' && !notes?.trim()) throw new MachineRuleViolation('Uma ação com falha exige uma nota técnica.');
    if (status === 'skipped' && action.isRequired && !notes?.trim()) throw new MachineRuleViolation('Justifique o não atendimento da ação obrigatória.');
    action.status = status; action.notes = notes; this.touch(now);
    if (status === 'failed') this.events.push({ type: 'PreventiveActionFailed', executionId: this.state.id, machineId: this.state.machineId, occurredAt: now, reason: notes });
  }
  blockSection(sectionExecutionId: string, reason: string, now = new Date().toISOString()) {
    if (this.state.status !== 'inProgress') throw new MachineRuleViolation('A preventiva deve estar em execução.');
    if (!reason.trim()) throw new MachineRuleViolation('Informe a justificativa para bloquear a seção.');
    const section = this.state.sections.find(item => item.id === sectionExecutionId); if (!section) throw new MachineRuleViolation('Seção não encontrada.');
    section.status = 'blocked'; section.notes = reason; this.touch(now);
    this.events.push({ type: 'PreventiveSectionBlocked', executionId: this.state.id, machineId: this.state.machineId, occurredAt: now, reason });
  }
  complete(now = new Date().toISOString()) {
    if (this.state.status !== 'inProgress') throw new MachineRuleViolation('Somente preventiva em execução pode ser concluída.');
    if (this.state.sections.some(section => section.isRequired && section.status !== 'completed')) throw new MachineRuleViolation('Todas as seções obrigatórias precisam estar concluídas.');
    if (this.state.sections.some(section => section.status === 'blocked')) throw new MachineRuleViolation('Há seção bloqueada. Registre uma justificativa e um finding antes de concluir.');
    if (this.state.sections.some(section => section.actions.some(action => action.isRequired && action.status !== 'completed'))) throw new MachineRuleViolation('Há ações obrigatórias pendentes.');
    this.state.completedAt = now; this.transition(['inProgress'], 'completed', now, 'PreventiveCompleted');
  }
  private transition(from: PreventiveExecutionStatus[], next: PreventiveExecutionStatus, now: string, event: PreventiveEvent['type'], reason?: string) { if (!from.includes(this.state.status)) throw new MachineRuleViolation(`Transição inválida: ${this.state.status} → ${next}.`); this.state.status = next; this.touch(now); this.events.push({ type: event, executionId: this.state.id, machineId: this.state.machineId, occurredAt: now, reason }); }
  private touch(now: string) { this.state.updatedAt = now; this.state.version += 1; }
}
