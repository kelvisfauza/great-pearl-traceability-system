import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

function load(path: string, context: Record<string,unknown> = {}) {
  const source=readFileSync(path,'utf8');
  const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
  let stripped=source;
  for(const node of [...ast.statements].reverse()) if(ts.isImportDeclaration(node)) stripped=stripped.slice(0,node.getStart(ast))+stripped.slice(node.end);
  const code=ts.transpileModule(stripped,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  let handler: ((req:Request)=>Promise<Response>) | undefined;
  const register=(fn:typeof handler)=>{handler=fn;};
  const sandbox:any={exports:{},Response,Request,URL,crypto:globalThis.crypto,console:{log(){},warn(){},error(){}},corsHeaders:{},Deno:{env:{get:()=> 'test-key'},serve:register},serve:register,...context};
  new Script(code).runInNewContext(sandbox);
  return {handler,sandbox};
}
const request=(body:unknown)=>new Request('https://example.test',{method:'POST',body:JSON.stringify(body)});

test('another staff member cannot process a saved payment transaction',async()=>{
  let providerCalls=0;
  const {handler}=load('supabase/functions/gosentepay-check-status/index.ts',{
    requireStaff:async()=>({userId:'caller',internal:false}),
    createClient:()=>({from:()=>({select:()=>({eq:()=>({single:async()=>({data:{user_id:'other',status:'pending'}})})})})}),
    fetch:()=>{providerCalls++;throw new Error('Provider reached');},
  });
  if(!handler)throw new Error('Handler missing');
  const result=await handler(request({transactionRef:'another-reference'}));
  assert.equal((await result.json()).ok,false);assert.equal(providerCalls,0);
});
test('model confirmation can only produce a draft, never dispatch',async()=>{
  const {sandbox}=load('supabase/functions/ai-search/index.ts');
  let calls=0;
  const draft=await sandbox.runSendMessage({functions:{invoke:()=>{calls++;}}},{confirmed:true,message:'Draft',recipients:['staff@example.test']},{name:'Admin',email:'admin@example.test'});
  assert.equal(draft.sent,false);assert.equal(calls,0);
});
test('verification cannot send codes to another signed-in account',async()=>{
  let reads=0;
  const {handler}=load('supabase/functions/send-email-verification/index.ts',{
    requireStaff:async()=>({email:'owner@example.test'}),createClient:()=>{reads++;throw new Error('Private read');},
  });
  if(!handler)throw new Error('Handler missing');
  const response=await handler(request({email:'other@example.test',action:'send_code'}));
  assert.equal((await response.json()).ok,false);assert.equal(reads,0);
});
for(const endpoint of ['dispatch-form-upload','notify-system-errors','payslip-access']) test(`${endpoint} denies anonymous callers before private work`,async()=>{
  let reads=0;
  const deny=async()=>new Response('{}',{status:401});
  const {handler}=load(`supabase/functions/${endpoint}/index.ts`,{requireStaff:deny,requireInternalOrAdmin:deny,createClient:()=>{reads++;throw new Error('Private read');}});
  if(!handler)throw new Error('Handler missing');
  assert.equal((await handler(request({}))).status,401);assert.equal(reads,0);
});
test('ordinary employees cannot probe selected guarantor finances',async()=>{
  let reads=0;
  const {handler}=load('supabase/functions/loan-evaluation/index.ts',{
    requireStaff:async()=>({email:'borrower@example.test',isAdmin:false}),createClient:()=>{reads++;throw new Error('Private read');},
  });
  if(!handler)throw new Error('Handler missing');
  assert.equal((await (await handler(request({guarantor_emails:['other@example.test']}))).json()).ok,false);assert.equal(reads,0);
});
test('retired collection payouts cannot dispatch through public or staff requests',async()=>{
  const {handler}=load('supabase/functions/gosentepay-withdraw-collection/index.ts',{
    retiredEndpointResponse:()=>new Response(JSON.stringify({ok:false}),{status:200}),
  });
  if(!handler)throw new Error('Handler missing');
  assert.equal((await (await handler(request({phone:'256700000001',amount:1000}))).json()).ok,false);
});