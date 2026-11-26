import { jsPDF } from 'npm:jspdf@2.5.2';
import tableModule from 'npm:jspdf-autotable@3.8.4';
const autoTable: any = (tableModule as any).default ?? tableModule;
import {accountTotals,openPartialPayments} from './rules.ts';
const money = (v: unknown) => v == null ? 'Not recorded' : Number(v).toLocaleString('en-GB',{maximumFractionDigits:0});
const eat = (v: string) => new Date(v).toLocaleString('en-GB',{timeZone:'Africa/Kampala',hour12:false});
export function buildFinancePdf(s: any, date: string, code: string, qr: string, generatedBy: string): Uint8Array {
  const doc = new jsPDF({unit:'mm',format:'a4',compress:true});
  doc.setFillColor(20,83,45); doc.rect(0,0,210,29,'F'); doc.setTextColor(255);
  doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('GREAT AGRO COFFEE',14,11);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text('a member of YEDA COFFEE COMPANY LIMITED',14,17);
  doc.text('P.O Box 431420, Kasese, Uganda',14,22);
  doc.setTextColor(20,30,25); doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Daily Finance & Treasury Report',14,39);
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.text(`Report date: ${date} | All amounts UGX`,14,46);
  doc.text(`Coverage: ${eat(s.start)} to ${eat(s.end)} EAT (end exclusive)`,14,52);
  doc.text(`Snapshot captured: ${eat(s.captured_at)} EAT`,14,58);
  let y=66;
  const table = (title: string,head: string[],body: any[][]) => {
    if(y>245){doc.addPage();y=18;}
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(title,14,y);
    autoTable(doc,{startY:y+4,head:[head],body:body.length?body:[head.map((_,i)=>i===0?'No recorded entries':'')],theme:'striped',styles:{fontSize:7,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:[20,83,45]},alternateRowStyles:{fillColor:[244,247,245]},margin:{left:14,right:14,top:18,bottom:35},rowPageBreak:'avoid'});
    y=(doc as any).lastAutoTable.finalY+10;
  };
  const total=accountTotals(s.accounts);
  table('1. Treasury accounts - reconstructed daily balances',['Account','Opening','Credits','Debits','Closing'],[
    ...s.accounts.map((a:any)=>[a.name,money(a.opening),money(a.credits),money(a.debits),money(a.closing)]),
    ['TOTAL',money(total.opening),money(total.credits),money(total.debits),money(total.closing)]
  ]);
  table('2. Balance and accounting notes',['Item','Explanation'],[
    ['Account reconstruction','Opening and closing reconstructed from current balances and immutable dated account entries.'],
    ['Internal transfers','Credits and debits include both legs of internal transfers. They are NOT external receipts or expenses.'],
    ['Pool vs account journals','The legacy pool journal and account journal are separate views of activity. Do not add their totals.'],
    ['GosentePay saved observation',s.gosente_observation?`${money(s.gosente_observation.new_balance)} UGX recorded ${eat(s.gosente_observation.created_at)} EAT`:'No saved observation before cutoff; not assumed zero.'],
    ['Yo saved reconciliation',s.yo_observation?`Recorded ${eat(s.yo_observation.recorded_at)} EAT. ${s.yo_observation.description || ''}`:'No saved reconciliation before cutoff; not assumed zero.'],
    ['Provider figures','Last saved observations only; not a fresh provider check or proof of available payout funds.'],
    ['Payment status','Receipts show recorded issuance, not confirmation of provider settlement. Pending lists are current at snapshot capture, not historical end-of-day balances.']
  ]);
  table('3. Every treasury account action',['Time EAT','Account / counter','Action & reference','Credit','Debit','By / recipient'],s.account_entries.map((e:any)=>[
    eat(e.created_at).split(', ').pop(),`${e.account_code}${e.counter_account?` / ${e.counter_account}`:''}`,`${e.description||''}\n${e.reference||'-'}`,e.direction==='credit'?money(e.amount):'',e.direction==='debit'?money(e.amount):'',`${e.performed_by||'-'}\n${e.related_user_name||e.related_user_email||''}`
  ]));
  table('4. Pool actions - payouts, fees, refunds and reconciliation',['Time EAT','Category / channel','Reference & description','Direction','Amount','Recorded balance'],s.pool_entries.map((e:any)=>[eat(e.created_at).split(', ').pop(),`${e.category} / ${e.channel}`,`${e.reference||'-'}\n${e.description||''}`,e.direction,money(e.amount),money(e.balance_after)]));
  table('5. Issued payment receipts - not settlement confirmation',['Reference / source','Recipient','Principal','Charges','Total','Method / transaction'],s.receipts.map((r:any)=>[`${r.reference}\n${r.source}`,r.recipient_name||'-',money(r.amount),money(r.charges),money(r.total),`${r.payment_method||'-'}\n${r.transaction_id||'-'}`]));
  table('6. Finance cash actions',['Reference','Action','Amount','Status','By'],s.cash_entries.map((r:any)=>[r.reference||'-',`${r.transaction_type}\n${r.notes||''}`,money(r.amount),r.status,r.confirmed_by||r.created_by||'-']));
  table('7. Expenses recorded for report date',['Description','Category / department','Amount','Status'],s.expenses.map((r:any)=>[r.description,`${r.category||'-'} / ${r.department||'-'}`,money(r.amount),r.status]));
  table('8. Unpaid partial requests - CURRENT at snapshot capture',['Request / payee','Total','Paid','Remaining','Status'],openPartialPayments(s.partial_payments_current).map((r:any)=>[`${r.title}\n${r.payee_name}`,money(r.total_amount),money(r.paid_amount),money(r.balance),r.status]));
  const coffee=s.coffee_payments_current;
  table('9. Supplier coffee backlog - CURRENT at snapshot capture',['Metric','Value'],[
    ['All unpaid lots',String(coffee.length)],
    ['Recorded outstanding balance (all unpaid lots)',money(coffee.reduce((sum:number,r:any)=>sum+Number(r.balance||0),0))],
    ['Detail below','30 most recently updated unpaid lots; older lots remain included in the total above. These are saved balances, not newly approved payments.']
  ]);
  table('10. Most recently updated unpaid supplier lots',['Batch / GRN','Total','Paid','Advance recovered','Remaining','Status'],coffee.slice(0,30).map((r:any)=>[`${r.batch_number||'-'} / ${r.grn_number||'-'}`,money(r.total_amount),money(r.paid),money(r.advance_recovered),money(r.balance),r.status||'-']));
  const count=doc.getNumberOfPages();
  for(let i=1;i<=count;i++){
    doc.setPage(i);doc.setDrawColor(180);doc.line(14,266,196,266);doc.setTextColor(70);doc.setFontSize(7);doc.setFont('helvetica','normal');
    doc.text(`Generated by: ${generatedBy}`,14,272);doc.text(`Verification: ${code}`,14,277);doc.text('Issuance only; not payment or approval confirmation.',14,282);doc.text(`Page ${i} of ${count} | ${date}`,14,288);
    doc.addImage(qr,'PNG',176,267,20,20);
  }
  return new Uint8Array(doc.output('arraybuffer'));
}
