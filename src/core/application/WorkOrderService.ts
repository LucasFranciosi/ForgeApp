import { DomainRuleViolation, WorkOrder, WorkOrderSnapshot } from '../domain/WorkOrder';
import { DomainEventRepository, UnitOfWork, WorkOrderRepository } from './ports';

export class WorkOrderService {
  constructor(private readonly orders: WorkOrderRepository, private readonly history: DomainEventRepository, private readonly uow: UnitOfWork) {}

  async create(snapshot: Omit<WorkOrderSnapshot, 'status' | 'version' | 'createdAt' | 'updatedAt' | 'actions' | 'hasPhoto' | 'hasSignature'> & { actions?: WorkOrderSnapshot['actions'] }): Promise<WorkOrderSnapshot> {
    return this.uow.transaction(async () => { const order = WorkOrder.open(snapshot); await this.orders.create(order); await this.history.append(order.pullEvents()); return order.snapshot(); });
  }
  async list(): Promise<WorkOrderSnapshot[]> { return (await this.orders.getAll()).map(order => order.snapshot()); }
  /** One-time migration path for the shipped demonstrative dataset. */
  async seed(snapshots: WorkOrderSnapshot[]): Promise<void> {
    await this.uow.transaction(async () => {
      for (const snapshot of snapshots) if (!await this.orders.getById(snapshot.id)) await this.orders.create(WorkOrder.restore(snapshot));
    });
  }
  async transition(id: string, version: number, action: 'schedule' | 'start' | 'pause' | 'complete' | 'cancel', data: { scheduledAt?: string; reason?: string; closingNotes?: string; photo?: boolean; signature?: boolean } = {}): Promise<WorkOrderSnapshot> {
    return this.uow.transaction(async () => {
      const order = await this.orders.getById(id);
      if (!order) throw new DomainRuleViolation('OS não encontrada.');
      const current = order.snapshot();
      if (current.version !== version) throw new DomainRuleViolation('A versão da OS está desatualizada.');
      if (data.photo || data.signature) order.attachEvidence({ photo: data.photo, signature: data.signature });
      if (action === 'schedule') order.schedule(data.scheduledAt ?? '');
      if (action === 'start') order.start();
      if (action === 'pause') order.pause(data.reason);
      if (action === 'complete') order.complete(data.closingNotes);
      if (action === 'cancel') order.cancel(data.reason ?? '');
      await this.orders.save(order, current.version); await this.history.append(order.pullEvents()); return order.snapshot();
    });
  }
  async updateAction(id:string,version:number,actionId:string,status:WorkOrderSnapshot['actions'][number]['status'],notes?:string):Promise<WorkOrderSnapshot>{
    return this.uow.transaction(async()=>{const order=await this.orders.getById(id);if(!order)throw new DomainRuleViolation('OS não encontrada.');if(order.snapshot().version!==version)throw new DomainRuleViolation('A versão da OS está desatualizada.');order.updateAction(actionId,status,notes);await this.orders.save(order,version);return order.snapshot();});
  }
}
