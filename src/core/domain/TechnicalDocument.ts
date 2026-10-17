export type DocumentIndexingStatus='pending'|'processing'|'indexed'|'failed';
export type TechnicalDocumentSnapshot={id:string;machineId:string;componentId?:string;title:string;documentType:string;discipline?:'mechanical'|'electrical'|'mixed';localUri:string;mimeType?:string;fileName?:string;fileSize?:number;fileHash?:string;fileAuditStatus?:'present'|'missing';indexingStatus:DocumentIndexingStatus;createdAt:string;updatedAt:string;version:number};
export class DocumentRuleViolation extends Error{constructor(message:string){super(message);this.name='DocumentRuleViolation';}}
export function validateDocument(d:TechnicalDocumentSnapshot){if(!d.machineId||!d.title.trim()||!d.localUri)throw new DocumentRuleViolation('Máquina, título e arquivo local são obrigatórios.');}
