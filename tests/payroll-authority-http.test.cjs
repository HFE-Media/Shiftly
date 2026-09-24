const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const esbuild=require('esbuild');
const c='10000000-0000-0000-0000-000000000001',actor='20000000-0000-0000-0000-000000000001';
function adapter(overrides={}) {
  const env={SUPABASE_URL:'https://isolated.supabase.co',SUPABASE_ANON_KEY:'synthetic-anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',PAYROLL_ALLOWED_ORIGINS:'https://isolated.example',PAYROLL_CONFIRMATION_SECRET:'synthetic-signing-secret-at-least-32-characters',...overrides};
  let handler,saved;const calls=[];
  const input={company:{id:c,name:'Synthetic',logo_url:''},rules:{calculate_paye:true,calculate_uif:true},
    employees:[{employee_id:'E1',full_name:'Synthetic E1',active:true,rate:25000,pay_type:'monthly',pay_cycle:'monthly'}],deductionTypes:[],events:[],deductions:[],adjustments:[],levy:null,
    history:{revision:'fixture-revision',employees:[{employee_id:'E1'}]}};
  const context={URL,Request,Response,TextEncoder,TextDecoder,AbortSignal,btoa,atob,crypto:crypto.webcrypto,
    Deno:{env:{get:k=>env[k]},serve:fn=>{handler=fn;}},fetch:async(url,options)=>{
      const route=new URL(url).pathname;calls.push({route,options});
      const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
      if(route==='/auth/v1/user')return options.headers.Authorization==='Bearer synthetic-owner'?response({id:actor}):new Response(JSON.stringify({message:'Invalid session'}),{status:401});
      if(route.endsWith('/commit_trusted_payroll')){
        assert.equal(options.headers.Authorization,'Bearer synthetic-service');assert.equal(options.headers.apikey,'synthetic-service');
        saved=JSON.parse(options.body);assert.equal(saved.actor,actor);return response('30000000-0000-0000-0000-000000000001');
      }
      assert.equal(options.headers.Authorization,'Bearer synthetic-owner');assert.equal(options.headers.apikey,'synthetic-anon');
      if(route.endsWith('/get_payroll_calculation_inputs'))return response(input);
      if(route.endsWith('/get_payroll_request'))return response(saved?{id:'30000000-0000-0000-0000-000000000001',confirmation:saved.payload.confirmation}:null);
      throw Error('Unexpected network path '+route);
    }};
  vm.createContext(context);
  for(const file of ['public/payroll-engine.js','public/payroll-history.js','src/payroll-authority.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  const source=fs.readFileSync('supabase/functions/payroll-authority/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
  vm.runInContext(esbuild.transformSync(source,{loader:'ts',target:'es2022'}).code,context);
  return {calls,input,saved:()=>saved,send:(body,auth='Bearer synthetic-owner',origin='https://isolated.example')=>handler(new Request('https://isolated.example/function',{method:'POST',headers:{origin,authorization:auth,'content-type':'application/json'},body:JSON.stringify(body)}))};
}
test('HTTP adapter keeps production and local origin/backend allowlists separate',async()=>{
  assert.throws(()=>adapter({SUPABASE_URL:'http://127.0.0.1:54321'}),/Unapproved payroll backend/);
  assert.throws(()=>adapter({PAYROLL_ALLOWED_ORIGINS:'http://localhost:5197'}),/Explicit approved origins/);
  assert.throws(()=>adapter({PAYROLL_LOCAL_TEST:'true'}),/Unapproved payroll backend/);
  adapter({PAYROLL_LOCAL_TEST:'true',SUPABASE_URL:'http://127.0.0.1:54321',PAYROLL_ALLOWED_ORIGINS:'http://127.0.0.1:5197'});
  const a=adapter();assert.equal((await a.send({},undefined,'https://unapproved.example')).status,403);assert.equal(a.calls.length,0);
});
test('HTTP adapter authenticates callers and rejects client monetary values before any commit',async()=>{
  const a=adapter();const body={action:'preview',c,start:'2026-09-01',end:'2026-09-30'};
  assert.equal((await a.send(body,'Bearer wrong')).status,400);
  const forged=await a.send({...body,gross:1});assert.equal(forged.status,400);assert.match((await forged.json()).error,/monetary values are not accepted/);
  assert(!a.calls.some(x=>x.route.endsWith('/commit_trusted_payroll')));
});
test('HTTP adapter executes the shared globals runtime and sends only recalculated money through service credentials',async()=>{
  const a=adapter();const preview=await a.send({action:'preview',c,start:'2026-09-01',end:'2026-09-30'});
  assert.equal(preview.status,200);const candidate=await preview.json();assert.equal(candidate.rows[0].gross,25000);
  const body={action:'finalise',c,request:crypto.randomUUID(),token:candidate.token};
  const result=await a.send(body);assert.equal(result.status,200);
  const saved=a.saved();assert.equal(saved.payload.rows[0].gross_remuneration,'25000.00');assert.equal(saved.payload.rows[0].paye_deducted,'3381.00');assert.equal(saved.payload.rows[0].employee_uif,'177.12');
  assert.equal((await a.send(body)).status,200);assert.equal(a.calls.filter(x=>x.route.endsWith('/commit_trusted_payroll')).length,1);
  const tampered=body.token.replace(/.$/,body.token.endsWith('0')?'1':'0');
  assert.match((await (await a.send({...body,token:tampered})).json()).error,/Invalid payroll confirmation/);
});
