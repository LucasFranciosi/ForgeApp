import { WorkOrderService } from './WorkOrderService';
import { SqliteDomainHistoryRepository, SqliteUnitOfWork, SqliteWorkOrderRepository } from '../infrastructure/sqlite/SqliteWorkOrderRepository';
import { MachineService } from './MachineService';
import { SqliteMachineHistoryRepository, SqliteMachineRepository } from '../infrastructure/sqlite/SqliteMachineRepository';
import { PerformanceService } from './PerformanceService';
import { SqlitePerformanceRepository } from '../infrastructure/sqlite/SqlitePerformanceRepository';
import { PreventiveService } from './PreventiveService';
import { SqlitePreventiveHistoryRepository, SqlitePreventiveRepository } from '../infrastructure/sqlite/SqlitePreventiveRepository';
import { StructureService } from './StructureService';
import { SqliteStructureRepository } from '../infrastructure/sqlite/SqliteStructureRepository';
import { FindingService } from './FindingService';
import { SqliteFindingRepository } from '../infrastructure/sqlite/SqliteFindingRepository';
import { DocumentService } from './DocumentService';
import { SqliteDocumentRepository } from '../infrastructure/sqlite/SqliteDocumentRepository';
import { SlaService } from './SlaService';
import { SqliteSlaRepository } from '../infrastructure/sqlite/SqliteSlaRepository';
import { LocalModelService } from './LocalModelService';
import { SqliteLocalModelRepository } from '../infrastructure/sqlite/SqliteLocalModelRepository';
import { ExpoDocumentFileStore } from '../infrastructure/files/DocumentFileStore';
import { ThreeDModelService } from './ThreeDModelService';
import { SqliteThreeDModelRepository } from '../infrastructure/sqlite/SqliteThreeDModelRepository';

/** Composition root: UI only receives application services, never direct SQL. */
export function createForgeServices() {
  return {
    workOrders: new WorkOrderService(new SqliteWorkOrderRepository(), new SqliteDomainHistoryRepository(), new SqliteUnitOfWork()),
    machines: new MachineService(new SqliteMachineRepository(), new SqliteMachineHistoryRepository(), new SqliteUnitOfWork()),
    performance: new PerformanceService(new SqlitePerformanceRepository()),
    preventives: new PreventiveService(new SqlitePreventiveRepository(), new SqlitePreventiveHistoryRepository(), new SqliteUnitOfWork()),
    structure: new StructureService(new SqliteStructureRepository()),
    findings: new FindingService(new SqliteFindingRepository(), new SqliteUnitOfWork()),
    documents: new DocumentService(new SqliteDocumentRepository(), new ExpoDocumentFileStore()),
    sla: new SlaService(new SqliteSlaRepository()),
    localModels: new LocalModelService(new SqliteLocalModelRepository()),
    threeDModels: new ThreeDModelService(new SqliteThreeDModelRepository(), new ExpoDocumentFileStore()),
  };
}
