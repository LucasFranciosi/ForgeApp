import { DomainEvent, WorkOrder, WorkOrderSnapshot } from '../../domain/WorkOrder';
import { ConcurrencyConflict, DomainEventRepository, UnitOfWork, WorkOrderRepository } from '../../application/ports';
import { forgeDatabase } from './ForgeDatabase';

type WorkOrderRow = Omit<WorkOrderSnapshot, 'actions' | 'requiresPhoto' | 'requiresSignature' | 'hasPhoto' | 'hasSignature'> & {
  requiresPhoto: number; requiresSignature: number; hasPhoto: number; hasSignature: number;
};
const bool = (value: number) => value === 1;

export class SqliteUnitOfWork implements UnitOfWork {
  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    const db = await forgeDatabase();
    await db.execAsync('BEGIN IMMEDIATE');
    try { const result = await operation(); await db.execAsync('COMMIT'); return result; }
    catch (error) { await db.execAsync('ROLLBACK'); throw error; }
  }
}

export class SqliteWorkOrderRepository implements WorkOrderRepository {
  async getAll(): Promise<WorkOrder[]> {
    const db = await forgeDatabase();
    const rows = await db.getAllAsync<WorkOrderRow>('SELECT * FROM workOrder ORDER BY createdAt DESC');
    return Promise.all(rows.map(row => this.getById(row.id))).then(orders => orders.filter((order): order is WorkOrder => order !== null));
  }
  async getById(id: string): Promise<WorkOrder | null> {
    const db = await forgeDatabase();
    const row = await db.getFirstAsync<WorkOrderRow>('SELECT * FROM workOrder WHERE id = ?', [id]);
    if (!row) return null;
    const actions = await db.getAllAsync<WorkOrderSnapshot['actions'][number]>('SELECT id, description, isRequired, status FROM workOrderAction WHERE workOrderId = ?', [id]);
    return WorkOrder.restore({ ...row, requiresPhoto: bool(row.requiresPhoto), requiresSignature: bool(row.requiresSignature), hasPhoto: bool(row.hasPhoto), hasSignature: bool(row.hasSignature), actions: actions.map(a => ({ ...a, isRequired: Boolean(a.isRequired) })) });
  }
  async create(order: WorkOrder): Promise<void> {
    const s = order.snapshot(); const db = await forgeDatabase();
    await db.runAsync(`INSERT INTO workOrder (id,machineId,componentId,code,title,description,type,discipline,priority,status,scheduledAt,startedAt,pausedAt,completedAt,cancelledAt,closingNotes,cancellationReason,requiresPhoto,requiresSignature,hasPhoto,hasSignature,version,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [s.id,s.machineId,s.componentId ?? null,s.code,s.title,s.description ?? null,s.type,s.discipline,s.priority,s.status,s.scheduledAt ?? null,s.startedAt ?? null,s.pausedAt ?? null,s.completedAt ?? null,s.cancelledAt ?? null,s.closingNotes ?? null,s.cancellationReason ?? null,Number(s.requiresPhoto),Number(s.requiresSignature),Number(s.hasPhoto),Number(s.hasSignature),s.version,s.createdAt,s.updatedAt]);
    for (const action of s.actions) await db.runAsync('INSERT INTO workOrderAction (id,workOrderId,description,isRequired,status) VALUES (?,?,?,?,?)', [action.id,s.id,action.description,Number(action.isRequired),action.status]);
  }
  async save(order: WorkOrder, expectedVersion: number): Promise<void> {
    const s = order.snapshot(); const db = await forgeDatabase();
    const result = await db.runAsync(`UPDATE workOrder SET status=?,scheduledAt=?,startedAt=?,pausedAt=?,completedAt=?,cancelledAt=?,closingNotes=?,cancellationReason=?,hasPhoto=?,hasSignature=?,version=?,updatedAt=? WHERE id=? AND version=?`,
      [s.status,s.scheduledAt ?? null,s.startedAt ?? null,s.pausedAt ?? null,s.completedAt ?? null,s.cancelledAt ?? null,s.closingNotes ?? null,s.cancellationReason ?? null,Number(s.hasPhoto),Number(s.hasSignature),s.version,s.updatedAt,s.id,expectedVersion]);
    if (result.changes !== 1) throw new ConcurrencyConflict();
    for(const action of s.actions) await db.runAsync('UPDATE workOrderAction SET status=? WHERE id=? AND workOrderId=?',[action.status,action.id,s.id]);
  }
  async addEvidence(input:{id:string;workOrderId:string;evidenceType:'photo'|'signature';localUri:string;fileHash?:string;createdAt:string}):Promise<void>{await(await forgeDatabase()).runAsync('INSERT INTO workOrderEvidence (id,workOrderId,evidenceType,localUri,fileHash,createdAt) VALUES (?,?,?,?,?,?)',[input.id,input.workOrderId,input.evidenceType,input.localUri,input.fileHash??null,input.createdAt]);}
}

export class SqliteDomainHistoryRepository implements DomainEventRepository {
  async append(events: DomainEvent[]): Promise<void> {
    const db = await forgeDatabase();
    for (const event of events) await db.runAsync('INSERT INTO domainHistory (aggregateType,aggregateId,machineId,eventType,occurredAt,reason) VALUES (?,?,?,?,?,?)', ['workOrder', event.workOrderId, event.machineId, event.type, event.occurredAt, event.reason ?? null]);
  }
}
