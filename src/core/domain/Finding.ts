export type FindingSeverity='low'|'medium'|'high'|'critical';
export type FindingStatus='open'|'convertedToWorkOrder'|'resolved'|'dismissed';
export type FindingSnapshot={id:string;machineId:string;componentId?:string;title:string;description?:string;severity:FindingSeverity;status:FindingStatus;createdAt:string;updatedAt:string;resolvedAt?:string;resolutionNotes?:string;workOrderId?:string;version:number};
export class FindingRuleViolation extends Error{constructor(message:string){super(message);this.name='FindingRuleViolation';}}
export function validateFinding(f:FindingSnapshot){if(!f.machineId||!f.title.trim())throw new FindingRuleViolation('Máquina e título são obrigatórios.');}
