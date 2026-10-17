import{LocalModelSnapshot,LocalModelType}from '../domain/LocalModel';
export interface LocalModelRepository{list():Promise<LocalModelSnapshot[]>;save(model:LocalModelSnapshot):Promise<void>}
export class LocalModelService{constructor(private readonly repo:LocalModelRepository){}list(){return this.repo.list()}save(model:LocalModelSnapshot){return this.repo.save(model)}async provisioned(type:LocalModelType){return(await this.repo.list()).some(x=>x.type===type&&x.status==='ready')}}
