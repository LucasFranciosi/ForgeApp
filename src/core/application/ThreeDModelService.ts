import { ThreeDModelSnapshot, validateThreeDModel } from '../domain/ThreeDModel';
import { DocumentFileStore } from './DocumentService';

export interface ThreeDModelRepository { latest(machineId: string): Promise<ThreeDModelSnapshot | null>; create(model: ThreeDModelSnapshot): Promise<void>; updateStatus(id: string, status: ThreeDModelSnapshot['status']): Promise<void>; }
export class ThreeDModelService {
  constructor(private readonly repository: ThreeDModelRepository, private readonly files: DocumentFileStore) {}
  latest(machineId: string) { return this.repository.latest(machineId); }
  async import(model: ThreeDModelSnapshot): Promise<ThreeDModelSnapshot> {
    validateThreeDModel(model);
    if(/\.gltf$/i.test(model.fileName??'')&&this.files.readText){
      let gltf:unknown; try{gltf=JSON.parse(await this.files.readText(model.localUri));}catch{throw new Error('O arquivo GLTF não contém JSON válido.');}
      const hasExternal=(items:unknown)=>Array.isArray(items)&&items.some((item:any)=>item?.uri&&!String(item.uri).startsWith('data:'));
      if(hasExternal((gltf as any).buffers)||hasExternal((gltf as any).images)) throw new Error('Este GLTF depende de arquivos externos. Exporte como GLB ou GLTF autocontido.');
    }
    const localUri = await this.files.persist(model.localUri, model.fileName);
    const fingerprint = await this.files.fingerprint(localUri);
    const stored = { ...model, localUri, fileHash: fingerprint.hash, fileSize: model.fileSize ?? fingerprint.size, status: 'available' as const };
    await this.repository.create(stored); return stored;
  }
  async audit(machineId: string): Promise<ThreeDModelSnapshot | null> { const model = await this.latest(machineId); if (!model) return null; const status = await this.files.exists(model.localUri) ? 'available' : 'missing'; if (status !== model.status) await this.repository.updateStatus(model.id, status); return { ...model, status }; }
}
