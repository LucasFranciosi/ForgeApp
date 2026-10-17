import { StructureRepository } from '../../application/StructureService';
import { PlantSnapshot, SectorSnapshot } from '../../domain/Structure';
import { forgeDatabase } from './ForgeDatabase';
import { ConcurrencyConflict } from '../../application/ports';
export class SqliteStructureRepository implements StructureRepository {
  async plants(){ return (await (await forgeDatabase()).getAllAsync<PlantSnapshot>('SELECT * FROM plant ORDER BY name')); }
  async sectors(plantId?:string){ const db=await forgeDatabase(); return plantId ? db.getAllAsync<SectorSnapshot>('SELECT * FROM plantSector WHERE plantId=? ORDER BY sortOrder,name',[plantId]) : db.getAllAsync<SectorSnapshot>('SELECT * FROM plantSector ORDER BY sortOrder,name'); }
  async getPlant(id:string){ return (await (await forgeDatabase()).getFirstAsync<PlantSnapshot>('SELECT * FROM plant WHERE id=?',[id]))??null; }
  async getSector(id:string){ return (await (await forgeDatabase()).getFirstAsync<SectorSnapshot>('SELECT * FROM plantSector WHERE id=?',[id]))??null; }
  async createPlant(p:PlantSnapshot){ await (await forgeDatabase()).runAsync('INSERT INTO plant (id,name,description,status,createdAt,updatedAt,version) VALUES (?,?,?,?,?,?,?)',[p.id,p.name,p.description??null,p.status,p.createdAt,p.updatedAt,p.version]); }
  async createSector(s:SectorSnapshot){ await (await forgeDatabase()).runAsync('INSERT INTO plantSector (id,plantId,parentSectorId,name,description,sortOrder,status,createdAt,updatedAt,version) VALUES (?,?,?,?,?,?,?,?,?,?)',[s.id,s.plantId,s.parentSectorId??null,s.name,s.description??null,s.sortOrder,s.status,s.createdAt,s.updatedAt,s.version]); }
  async updatePlant(p:PlantSnapshot,v:number){const r=await(await forgeDatabase()).runAsync('UPDATE plant SET name=?,description=?,status=?,updatedAt=?,version=? WHERE id=? AND version=?',[p.name,p.description??null,p.status,p.updatedAt,p.version,p.id,v]);if(r.changes!==1)throw new ConcurrencyConflict();}
  async updateSector(s:SectorSnapshot,v:number){const r=await(await forgeDatabase()).runAsync('UPDATE plantSector SET parentSectorId=?,name=?,description=?,sortOrder=?,status=?,updatedAt=?,version=? WHERE id=? AND version=?',[s.parentSectorId??null,s.name,s.description??null,s.sortOrder,s.status,s.updatedAt,s.version,s.id,v]);if(r.changes!==1)throw new ConcurrencyConflict();}
}
