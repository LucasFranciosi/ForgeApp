export type PlantSnapshot = { id: string; name: string; description?: string; status: 'active' | 'inactive'; createdAt: string; updatedAt: string; version: number };
export type SectorSnapshot = { id: string; plantId: string; parentSectorId?: string; name: string; description?: string; sortOrder: number; status: 'active' | 'inactive'; createdAt: string; updatedAt: string; version: number };
export class StructureRuleViolation extends Error { constructor(message: string) { super(message); this.name = 'StructureRuleViolation'; } }
export function validatePlant(plant: PlantSnapshot) { if (!plant.name.trim()) throw new StructureRuleViolation('O nome da planta é obrigatório.'); }
export function validateSector(sector: SectorSnapshot) { if (!sector.plantId || !sector.name.trim()) throw new StructureRuleViolation('Planta e nome do setor são obrigatórios.'); if (sector.parentSectorId === sector.id) throw new StructureRuleViolation('Um setor não pode ser seu próprio pai.'); }
