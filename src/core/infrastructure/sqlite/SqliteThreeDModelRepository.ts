import { ThreeDModelRepository } from '../../application/ThreeDModelService';
import { ThreeDModelSnapshot } from '../../domain/ThreeDModel';
import { forgeDatabase } from './ForgeDatabase';

export class SqliteThreeDModelRepository implements ThreeDModelRepository {
  async latest(machineId: string) { return (await (await forgeDatabase()).getFirstAsync<ThreeDModelSnapshot>('SELECT * FROM machineThreeDModel WHERE machineId=? ORDER BY updatedAt DESC LIMIT 1', [machineId])) ?? null; }
  async create(model: ThreeDModelSnapshot) { await (await forgeDatabase()).runAsync('INSERT INTO machineThreeDModel (id,machineId,localUri,fileName,fileSize,fileHash,status,createdAt,updatedAt,version) VALUES (?,?,?,?,?,?,?,?,?,?)', [model.id,model.machineId,model.localUri,model.fileName??null,model.fileSize??null,model.fileHash??null,model.status,model.createdAt,model.updatedAt,model.version]); }
  async updateStatus(id: string, status: ThreeDModelSnapshot['status']) { await (await forgeDatabase()).runAsync('UPDATE machineThreeDModel SET status=?,updatedAt=?,version=version+1 WHERE id=?',[status,new Date().toISOString(),id]); }
}
