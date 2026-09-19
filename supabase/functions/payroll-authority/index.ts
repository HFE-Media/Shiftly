// Local preparation only: deployment/activation require separate approval.
import '../../../public/payroll-engine.js';
import '../../../public/payroll-history.js';
import '../../../src/payroll-authority.js';

const env = (name: string) => Deno.env.get(name) || '';
const base = new URL(env('SUPABASE_URL'));
const local = env('PAYROLL_LOCAL_TEST') === 'true';
const loopback = (host: string) => ['localhost','127.0.0.1','[::1]'].includes(host);
if (!(local ? loopback(base.hostname) : base.protocol === 'https:' && base.hostname.endsWith('.supabase.co'))) throw Error('Unapproved payroll backend');
const origins = env('PAYROLL_ALLOWED_ORIGINS').split(',').map(s=>s.trim()).filter(Boolean);
if (!origins.length || origins.some(s=> { const u=new URL(s); return u.origin!==s || (local ? !loopback(u.hostname) : u.protocol!=='https:' || loopback(u.hostname)); })) throw Error('Explicit approved origins required');
const anon = env('SUPABASE_ANON_KEY');
const service = env('SUPABASE_SERVICE_ROLE_KEY');
async function request(path: string, authorization: string, args?: unknown, privileged=false) {
  const response=await fetch(new URL(path,base), {method:args===undefined?'GET':'POST',
    headers:{Authorization:authorization,apikey:privileged?service:anon,'Content-Type':'application/json'},
    ...(args===undefined?{}:{body:JSON.stringify(args)})});
  const result=await response.json();
  if(!response.ok) throw Error(result.message || result.error_description || 'Payroll request failed');
  return result;
}
const rpc=(name: string, auth: string, args: unknown)=>request('/rest/v1/rpc/'+name,auth,args);
const authority = (globalThis as unknown as {ShiftlyPayrollAuthority:{create:(deps:unknown)=>(auth:string,body:unknown)=>Promise<unknown>}}).ShiftlyPayrollAuthority.create({
  secret:env('PAYROLL_CONFIRMATION_SECRET'),
  user:(auth:string)=>request('/auth/v1/user',auth),
  inputs:(auth:string,c:string,s:string,t:string)=>rpc('get_payroll_calculation_inputs',auth,{c,s,t}),
  request:(auth:string,c:string,request:string)=>rpc('get_payroll_request',auth,{c,request}),
  commit:(actor:string,c:string,requestId:string,payload:unknown)=>request('/rest/v1/rpc/commit_trusted_payroll','Bearer '+service,{actor,c,request:requestId,payload},true),
  logo:async(url:string)=>{
    if(!url) return '';
    const target=new URL(url);
    if(target.origin!==base.origin || !target.pathname.startsWith('/storage/v1/object/public/company-logos/')) throw Error('Company logo must use approved company-logo Storage');
    const response=await fetch(target,{redirect:'error',signal:AbortSignal.timeout(10000)});
    const mime=response.headers.get('content-type')?.split(';')[0];
    if(!response.ok || !['image/png','image/jpeg','image/webp'].includes(mime||'') || !response.body) throw Error('Cannot freeze company logo');
    const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2097152){await reader.cancel();throw Error('Logo exceeds 2 MB');}chunks.push(value);}
    let binary='';for(const chunk of chunks)for(const byte of chunk)binary+=String.fromCharCode(byte);
    return `data:${mime};base64,${btoa(binary)}`;
  }
});
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
    ...(origins.includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
  if(!origins.includes(origin)) return new Response(JSON.stringify({error:'Unapproved origin'}),{status:403,headers});
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(req.method!=='POST') return new Response(JSON.stringify({error:'POST required'}),{status:405,headers});
  try{
    const body=await req.text();if(body.length>16000)throw Error('Payroll request too large');
    return new Response(JSON.stringify(await authority(req.headers.get('authorization')||'',JSON.parse(body))),{headers});
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:'Payroll request failed'}),{status:400,headers});}
});
