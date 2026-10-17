/** Domain aggregate. It deliberately has no React Native, SQLite or network imports. */
export type WorkOrderStatus = 'open' | 'scheduled' | 'inProgress' | 'paused' | 'completed' | 'cancelled';
export type WorkOrderType = 'preventive' | 'corrective' | 'inspection';
export type MaintenanceDiscipline = 'mechanical' | 'electrical' | 'mixed';
export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'critical';

export type WorkOrderAction = {
  id: string;
  description: string;
  isRequired: boolean;
  status: 'pending' | 'inProgress' | 'completed' | 'skipped' | 'failed';
};

export type DomainEvent = {
  type: 'WorkOrderOpened' | 'WorkOrderScheduled' | 'WorkOrderStarted' | 'WorkOrderPaused' | 'WorkOrderResumed' | 'WorkOrderCompleted' | 'WorkOrderCancelled';
  occurredAt: string;
  workOrderId: string;
  machineId: string;
  reason?: string;
};

export type WorkOrderSnapshot = {
  id: string; machineId: string; componentId?: string; code: string; title: string;
  description?: string; type: WorkOrderType; discipline: MaintenanceDiscipline;
  priority: WorkOrderPriority; status: WorkOrderStatus; scheduledAt?: string;
  startedAt?: string; pausedAt?: string; completedAt?: string; cancelledAt?: string;
  closingNotes?: string; cancellationReason?: string; requiresPhoto: boolean;
  requiresSignature: boolean; hasPhoto: boolean; hasSignature: boolean;
  version: number; createdAt: string; updatedAt: string; actions: WorkOrderAction[];
};

export class DomainRuleViolation extends Error {
  constructor(message: string) { super(message); this.name = 'DomainRuleViolation'; }
}

export class WorkOrder {
  private events: DomainEvent[] = [];
  private constructor(private state: WorkOrderSnapshot) {}

  static open(input: Omit<WorkOrderSnapshot, 'status' | 'version' | 'createdAt' | 'updatedAt' | 'actions' | 'hasPhoto' | 'hasSignature'> & { actions?: WorkOrderAction[]; now?: string }): WorkOrder {
    const now = input.now ?? new Date().toISOString();
    if (!input.title.trim()) throw new DomainRuleViolation('O título da OS é obrigatório.');
    const order = new WorkOrder({ ...input, status: 'open', version: 1, createdAt: now, updatedAt: now, hasPhoto: false, hasSignature: false, actions: input.actions ?? [] });
    order.record('WorkOrderOpened', now);
    return order;
  }

  static restore(snapshot: WorkOrderSnapshot): WorkOrder { return new WorkOrder({ ...snapshot, actions: [...snapshot.actions] }); }
  snapshot(): WorkOrderSnapshot { return { ...this.state, actions: [...this.state.actions] }; }
  pullEvents(): DomainEvent[] { const events = this.events; this.events = []; return events; }

  schedule(scheduledAt: string, now = new Date().toISOString()): void {
    if (Number.isNaN(Date.parse(scheduledAt))) throw new DomainRuleViolation('A data de agendamento é inválida.');
    this.transition(['open'], 'scheduled', now, 'WorkOrderScheduled');
    this.state.scheduledAt = scheduledAt;
  }
  start(now = new Date().toISOString()): void {
    this.transition(['open', 'scheduled', 'paused'], 'inProgress', now, this.state.status === 'paused' ? 'WorkOrderResumed' : 'WorkOrderStarted');
    this.state.startedAt ??= now;
    this.state.pausedAt = undefined;
  }
  pause(reason?: string, now = new Date().toISOString()): void {
    this.transition(['inProgress'], 'paused', now, 'WorkOrderPaused', reason);
  }
  attachEvidence({ photo = false, signature = false }: { photo?: boolean; signature?: boolean }): void {
    this.state.hasPhoto ||= photo; this.state.hasSignature ||= signature;
  }
  updateAction(actionId:string,status:WorkOrderAction['status'],notes?:string):void {
    if(this.state.status!=='inProgress') throw new DomainRuleViolation('Ações só podem ser atualizadas com a OS em execução.');
    const action=this.state.actions.find(item=>item.id===actionId);
    if(!action) throw new DomainRuleViolation('Ação da OS não encontrada.');
    if((status==='failed'||status==='skipped')&&!notes?.trim()) throw new DomainRuleViolation('Informe uma nota para falha ou ação ignorada.');
    action.status=status; this.state.updatedAt=new Date().toISOString(); this.state.version+=1;
  }
  complete(closingNotes?: string, now = new Date().toISOString()): void {
    if (this.state.status !== 'inProgress') throw new DomainRuleViolation('Apenas uma OS em execução pode ser concluída.');
    if (this.state.actions.some(a => a.isRequired && a.status !== 'completed')) throw new DomainRuleViolation('Todas as ações obrigatórias devem estar concluídas.');
    if (this.state.requiresPhoto && !this.state.hasPhoto) throw new DomainRuleViolation('Foto obrigatória ausente.');
    if (this.state.requiresSignature && !this.state.hasSignature) throw new DomainRuleViolation('Assinatura obrigatória ausente.');
    this.state.closingNotes = closingNotes;
    this.state.completedAt = now;
    this.transition(['inProgress'], 'completed', now, 'WorkOrderCompleted');
  }
  cancel(reason: string, now = new Date().toISOString()): void {
    if (!reason.trim()) throw new DomainRuleViolation('O motivo do cancelamento é obrigatório.');
    this.state.cancellationReason = reason; this.state.cancelledAt = now;
    this.transition(['open', 'scheduled', 'inProgress', 'paused'], 'cancelled', now, 'WorkOrderCancelled', reason);
  }

  private transition(from: WorkOrderStatus[], next: WorkOrderStatus, now: string, event: DomainEvent['type'], reason?: string): void {
    if (!from.includes(this.state.status)) throw new DomainRuleViolation(`Transição inválida: ${this.state.status} → ${next}.`);
    this.state.status = next; this.state.updatedAt = now; this.state.version += 1; this.record(event, now, reason);
  }
  private record(type: DomainEvent['type'], occurredAt: string, reason?: string): void { this.events.push({ type, occurredAt, workOrderId: this.state.id, machineId: this.state.machineId, reason }); }
}
