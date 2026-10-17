import { DomainEvent, WorkOrder, WorkOrderSnapshot } from '../domain/WorkOrder';

export interface WorkOrderRepository {
  getById(id: string): Promise<WorkOrder | null>;
  getAll(): Promise<WorkOrder[]>;
  save(order: WorkOrder, expectedVersion: number): Promise<void>;
  create(order: WorkOrder): Promise<void>;
  addEvidence?(input:{id:string;workOrderId:string;evidenceType:'photo'|'signature';localUri:string;fileHash?:string;createdAt:string}):Promise<void>;
}

export interface UnitOfWork { transaction<T>(operation: () => Promise<T>): Promise<T>; }
export interface DomainEventRepository { append(events: DomainEvent[]): Promise<void>; }
export type WorkOrderView = WorkOrderSnapshot;

export class ConcurrencyConflict extends Error {
  constructor() { super('O registro foi alterado em outro fluxo. Atualize e tente novamente.'); this.name = 'ConcurrencyConflict'; }
}
