import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { mayApproveExternalPayout } from '../_shared/external-payout.ts';
Deno.test('external meal payments require independent administrator approval',()=>{
  assertEquals(mayApproveExternalPayout('requester','requester',true,'pending'),false);
  assertEquals(mayApproveExternalPayout('requester','other',false,'pending'),false);
  assertEquals(mayApproveExternalPayout('requester','other',true,'pending'),true);
});
Deno.test('already claimed external payments cannot be approved again',()=>{
  assertEquals(mayApproveExternalPayout('requester','other',true,'processing'),false);
  assertEquals(mayApproveExternalPayout('requester','other',true,'recorded'),false);
});