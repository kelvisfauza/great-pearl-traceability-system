import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {reportWindow,FINANCE_CRON,accountTotals,openPartialPayments} from './rules.ts';
Deno.test('rejected unpaid balances are not reported as pending payment',()=>assertEquals(openPartialPayments([{status:'balance_rejected',balance:143750},{status:'part_paid',balance:100000}]),[{status:'part_paid',balance:100000}]));
Deno.test('daily report scheduled at 8 PM Uganda time',()=>assertEquals(FINANCE_CRON,'0 17 * * *'));
Deno.test('daily report covers midnight to 8 PM Uganda time',()=>assertEquals(reportWindow('2026-11-26',false),{start:'2026-11-25T21:00:00.000Z',end:'2026-11-26T17:00:00.000Z'}));
Deno.test('yesterday test covers the complete Uganda calendar day',()=>assertEquals(reportWindow('2026-11-25',true),{start:'2026-11-24T21:00:00.000Z',end:'2026-11-25T21:00:00.000Z'}));
Deno.test('invalid dates do not become different report days',()=>{assertThrows(()=>reportWindow('2026-02-30',true));});
Deno.test('internal transfers do not inflate net treasury money',()=>assertEquals(accountTotals([{opening:100,closing:80,credits:0,debits:20},{opening:0,closing:20,credits:20,debits:0}]),{opening:100,closing:100,credits:20,debits:20}));
