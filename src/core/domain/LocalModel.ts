export type LocalModelType='llm'|'vision'|'embedding'|'whisper';
export type LocalModelStatus='absent'|'ready'|'failed';
export type LocalModelSnapshot={id:string;name:string;type:LocalModelType;localPath?:string;sizeBytes:number;status:LocalModelStatus;updatedAt:string;version:number};
export type AiAnswer={facts:string[];evidence:string[];hypotheses:string[];checks:string[]};
export interface LocalAiGateway{isReady(type:LocalModelType):Promise<boolean>;askMachine(input:{machineId:string;question:string}):Promise<AiAnswer>;transcribe(localUri:string):Promise<string>;analyzeImage(localUri:string):Promise<string>;}
