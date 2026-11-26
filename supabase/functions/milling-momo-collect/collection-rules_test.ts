import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { validateCollection } from './collection-rules.ts';
const saved = [{id:'customer-1',full_name:'Saved Customer',phone:'0700000001',current_balance:20000}];
Deno.test('milling collections require a saved customer phone',()=>{
  assertEquals(validateCollection('256700000001',10000,[{customer_id:'customer-1',amount:10000}],saved)[0].customer_name,'Saved Customer');
  assertThrows(()=>validateCollection('256700000002',10000,[{customer_id:'customer-1',amount:10000}],saved));
});
Deno.test('milling cannot charge more than the recorded customer debt',()=>{
  assertThrows(()=>validateCollection('256700000001',20001,[{customer_id:'customer-1',amount:20001}],saved));
  assertEquals(validateCollection('256700000001',20000,[{customer_id:'customer-1',amount:20000}],saved)[0].amount,20000);
});
Deno.test('milling rejects duplicate, negative and mismatched allocations',()=>{
  assertThrows(()=>validateCollection('256700000001',10000,[{customer_id:'customer-1',amount:5000},{customer_id:'customer-1',amount:5000}],saved));
  assertThrows(()=>validateCollection('256700000001',10000,[{customer_id:'customer-1',amount:-10000}],saved));
  assertThrows(()=>validateCollection('256700000001',10000,[{customer_id:'customer-1',amount:9000}],saved));
});