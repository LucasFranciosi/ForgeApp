import { describe, expect, it } from 'vitest';
import { DomainRuleViolation, WorkOrder } from './WorkOrder';

const base={id:'os-1',machineId:'m-1',code:'OS-1',title:'Inspeção',type:'inspection' as const,discipline:'mixed' as const,priority:'normal' as const,requiresPhoto:true,requiresSignature:true};
describe('WorkOrder',()=>{
  it('requires mandatory actions and evidence before completion',()=>{
    const order=WorkOrder.open({...base,actions:[{id:'a',description:'Verificar',isRequired:true,status:'pending'}]});
    order.start(); expect(()=>order.complete()).toThrow(DomainRuleViolation);
    order.updateAction('a','completed'); order.attachEvidence({photo:true,signature:true}); order.complete('ok');
    expect(order.snapshot().status).toBe('completed');
  });
  it('rejects invalid terminal transitions',()=>{const order=WorkOrder.open(base);expect(()=>order.complete()).toThrow('Apenas uma OS');expect(()=>order.cancel('')).toThrow('motivo');});
});
