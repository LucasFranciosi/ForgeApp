import { describe, expect, it } from 'vitest';
import { overlapMinutes, shiftMinutes, validateShift } from './Schedule';
describe('shifts',()=>{
  it('calculates overnight shifts',()=>expect(shiftMinutes({startsAtLocal:'22:00',endsAtLocal:'06:00',crossesMidnight:true})).toBe(480));
  it('rejects inconsistent overnight declaration',()=>expect(()=>validateShift({id:'x',machineId:'m',effectiveFrom:'2026-01-01',weekday:1,startsAtLocal:'22:00',endsAtLocal:'06:00',crossesMidnight:false,createdAt:'',updatedAt:'',version:1})).toThrow());
  it('intersects periods without negative time',()=>expect(overlapMinutes('2026-01-01T10:00:00Z','2026-01-01T11:00:00Z','2026-01-01T12:00:00Z','2026-01-01T13:00:00Z')).toBe(0));
});
