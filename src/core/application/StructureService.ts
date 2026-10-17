import { PlantSnapshot, SectorSnapshot, StructureRuleViolation, validatePlant, validateSector } from '../domain/Structure';

export interface StructureRepository { plants(): Promise<PlantSnapshot[]>; sectors(plantId?: string): Promise<SectorSnapshot[]>; getPlant(id:string):Promise<PlantSnapshot|null>; getSector(id:string):Promise<SectorSnapshot|null>; createPlant(plant:PlantSnapshot):Promise<void>; createSector(sector:SectorSnapshot):Promise<void>; updatePlant(plant:PlantSnapshot,version:number):Promise<void>; updateSector(sector:SectorSnapshot,version:number):Promise<void>; }
export class StructureService {
  constructor(private readonly repository: StructureRepository) {}
  plants() { return this.repository.plants(); }
  sectors(plantId?:string) { return this.repository.sectors(plantId); }
  async seed(plant: PlantSnapshot, sectors: SectorSnapshot[]) { if (!await this.repository.getPlant(plant.id)) await this.repository.createPlant(plant); for (const sector of sectors) if (!await this.repository.getSector(sector.id)) await this.repository.createSector(sector); }
  async createPlant(plant:PlantSnapshot) { validatePlant(plant); await this.repository.createPlant(plant); }
  async updatePlant(plant:PlantSnapshot,version:number){validatePlant(plant);await this.repository.updatePlant({...plant,updatedAt:new Date().toISOString(),version:version+1},version);}
  async createSector(sector:SectorSnapshot) { validateSector(sector); if (!await this.repository.getPlant(sector.plantId)) throw new StructureRuleViolation('A planta selecionada não existe.'); if (sector.parentSectorId) { const parent=await this.repository.getSector(sector.parentSectorId); if (!parent || parent.plantId!==sector.plantId) throw new StructureRuleViolation('O setor pai deve pertencer à mesma planta.'); } await this.repository.createSector(sector); }
  async updateSector(sector:SectorSnapshot,version:number){validateSector(sector);if(sector.parentSectorId){let parent=await this.repository.getSector(sector.parentSectorId);while(parent){if(parent.id===sector.id)throw new StructureRuleViolation('A hierarquia de setores não pode conter ciclos.');parent=parent.parentSectorId?await this.repository.getSector(parent.parentSectorId):null;}}await this.repository.updateSector({...sector,updatedAt:new Date().toISOString(),version:version+1},version);}
}
