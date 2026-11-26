import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {reportWindow,FINANCE_CRON,accountTotals,openPartialPayments,financeSummary} from './rules.ts';
Deno.test('rejected unpaid balances are not reported as pending payment',()=>assertEquals(openPartialPayments([{status:'balance_rejected',balance:143750},{status:'part_paid',balance:100000}]),[{status:'part_paid',balance:100000}]));
Deno.test('daily report scheduled at 8 PM Uganda time',()=>assertEquals(FINANCE_CRON,'0 17 * * *'));
Deno.test('daily report covers midnight to 8 PM Uganda time',()=>assertEquals(reportWindow('2026-11-26',false),{start:'2026-11-25T21:00:00.000Z',end:'2026-11-26T17:00:00.000Z'}));
Deno.test('yesterday test covers the complete Uganda calendar day',()=>assertEquals(reportWindow('2026-11-25',true),{start:'2026-11-24T21:00:00.000Z',end:'2026-11-25T21:00:00.000Z'}));
Deno.test('invalid dates do not become different report days',()=>{assertThrows(()=>reportWindow('2026-02-30',true));});
Deno.test('internal transfers do not inflate net treasury money',()=>assertEquals(accountTotals([{opening:100,closing:80,credits:0,debits:20},{opening:0,closing:20,credits:20,debits:0}]),{opening:100,closing:100,credits:20,debits:20}));
Deno.test('summary totals exclude duplicate receipts, pool entries and employee transfers',()=>{
  const s=financeSummary({account_entries:[
    {id:'w1',reference:'w',account_code:'user_wallets',counter_account:'external',direction:'debit',amount:15000,metadata:{source:'WITHDRAWAL'}},
    {id:'w2',reference:'w',account_code:'loans_overdrafts',counter_account:'external',direction:'debit',amount:5000,metadata:{source:'WITHDRAWAL'}},
    {id:'m',reference:'m',counter_account:'external',direction:'debit',amount:50000,report_category:'meal_plan'},
    {id:'p',reference:'p',counter_account:'external',direction:'debit',amount:40000,metadata:{service_provider_payment_id:'saved'}},
    {id:'f',reference:'f',counter_account:'external',direction:'debit',amount:1600,metadata:{kind:'provider_fee'}},
    {id:'r',reference:'r',counter_account:'external',direction:'credit',amount:5000,metadata:{source:'REFUND'}},
    {id:'t',reference:'t',counter_account:'external',direction:'debit',amount:20000,metadata:{source:'INTERNAL_TRANSFER'}},
    {id:'i',reference:'i',counter_account:'invest_earn',direction:'debit',amount:30000,metadata:{source:'WITHDRAWAL',meta_type:'investment_lock'}},
    {id:'d',reference:'d',counter_account:'external',direction:'credit',amount:100000,metadata:{momo_deposit:true}},
  ],receipts:[{amount:999999}],pool_entries:[{direction:'debit',amount:999999}]});
  assertEquals(s.withdrawals,{amount:20000,count:1});
  assertEquals(s.payments,{amount:90000,count:2});
  assertEquals(s.mealPlans.amount,50000);assertEquals(s.serviceProviders.amount,40000);
  assertEquals(s.providerCharges,1600);assertEquals(s.externalDebits,111600);
  assertEquals(s.refunds,5000);assertEquals(s.netExternalOutflow,106600);
});
Deno.test('investment credits and balance are not reported as business profit',()=>{
  const s=financeSummary({accounts:[{code:'invest_earn',credits:30000,closing:70000},{code:'profits',credits:10000}]});
  assertEquals(s.investmentCredits,30000);assertEquals(s.investmentClosing,70000);
  assertEquals(s.profitAccountCredits,10000);assertEquals(s.grossProfit,null);assertEquals(s.netProfit,null);
});
Deno.test('historical reconciliation adjustments are not payments made today',()=>{
  const s=financeSummary({account_entries:[
    {reference:'RECON-YO-OLD-FEE',counter_account:'external',direction:'debit',amount:2124},
    {reference:'FIX-RETURN',counter_account:'external',direction:'credit',amount:6000,metadata:{correction:true}},
    {reference:'w',counter_account:'external',direction:'debit',amount:12000,metadata:{source:'WITHDRAWAL'}},
  ]});
  assertEquals(s.payments.amount,0);assertEquals(s.netExternalOutflow,12000);assertEquals(s.reconciliationNet,3876);
});
Deno.test('gross and net profit use balanced classified accounting journals only',()=>{
  const p={line_count:6,balanced:true,unclassified_lines:0,revenue:200000,cost_of_sales:110000,operating_expenses:20000};
  assertEquals(financeSummary({profit_loss:p}).grossProfit,90000);
  assertEquals(financeSummary({profit_loss:p}).netProfit,70000);
  assertEquals(financeSummary({profit_loss:{...p,balanced:false}}).netProfit,null);
  assertEquals(financeSummary({profit_loss:{...p,unclassified_lines:1}}).netProfit,null);
  assertEquals(financeSummary({profit_loss:{...p,line_count:0}}).netProfit,null);
});
