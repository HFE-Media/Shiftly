import { sanitizeJpeg } from './jpeg.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BASE='https://szougedvngaoratbtars.supabase.co';
const BUCKET='shiftly-jobs-test'; // Preserve existing pilot photo references.
const encoder=new TextEncoder();
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const objectKey=d=>`${d.companyId}/${d.jobId}/photos/${d.photoId}.jpg`;
export async function readBounded(request,limit) {
  if(Number(request.headers.get('content-length'))>limit) fail('Photo too large.',413);
  if(!request.body) fail('Request body required.');
  const reader=request.body.getReader(),parts=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();fail('Photo too large.',413);}parts.push(value);}
  const result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
function validate(d,upload) {
  if(!d || !UUID.test(d.companyId||'') || !UUID.test(d.jobId||''))fail('Invalid Job.');
  if(upload){
    if(!UUID.test(d.photoId||'') || !Number.isSafeInteger(d.revision) || d.revision<1)fail('Refresh the Job first.');
    if(!['before','during','after','other'].includes(d.category) || typeof d.note!=='string' || d.note.length>500)fail('Invalid photo details.');
  } else if(d.action!=='view' || !Array.isArray(d.photoIds) || d.photoIds.length>100 || !d.photoIds.every(id=>UUID.test(id)))fail('Invalid photo IDs.');
}
async function signingKey(env){return crypto.subtle.importKey('raw',encoder.encode(env.PHOTO_SIGNING_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export function createWorker(fetcher=fetch) {
  async function rpc(env,name,body,token,privileged=false) {
    const credential=privileged?env.SUPABASE_SERVICE_ROLE_KEY:token;
    const r=await fetcher(`${BASE}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:privileged?env.SUPABASE_SERVICE_ROLE_KEY:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${credential}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const result=await r.json();
    if(!r.ok){if(r.status===401||r.status===403||result.code==='42501')fail('Photo access denied.',403);if(result.code==='PGRST202')fail('Photo setup unavailable.',503);fail('Job changed or photo outcome uncertain. Reopen the Job before retrying.',409);}
    return result;
  }
  return { async fetch(request,env) {
    const url=new URL(request.url),origin=request.headers.get('Origin');
    const allowed=String(env.ALLOWED_ORIGINS||'').split(',').includes(origin);
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(allowed?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})};
    const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
    try {
      if(!env.PHOTOS || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY || String(env.PHOTO_SIGNING_SECRET||'').length<32)fail('Photo service is not configured.',503);
      // Read grants expire after five minutes. Never expose bucket public access.
      if(request.method==='GET' && url.pathname==='/image') {
        const d={companyId:url.searchParams.get('company'),jobId:url.searchParams.get('job'),photoId:url.searchParams.get('photo')};
        const expires=Number(url.searchParams.get('expires')),now=Math.floor(Date.now()/1000),sig=url.searchParams.get('sig')||'';
        if(!Object.values(d).every(v=>UUID.test(v||'')) || !Number.isInteger(expires) || expires<=now || expires>now+300 || !/^[a-f0-9]{64}$/.test(sig))fail('Photo link expired or invalid.',403);
        const key=objectKey(d),signature=Uint8Array.from(sig.match(/../g),v=>parseInt(v,16));
        if(!await crypto.subtle.verify('HMAC',await signingKey(env),signature,encoder.encode(`${key}\n${expires}`)))fail('Invalid photo link.',403);
        const object=await env.PHOTOS.get(key);if(!object)fail('Photo unavailable.',404);
        return new Response(object.body,{headers:{...headers,'Content-Type':'image/jpeg','Content-Disposition':'inline; filename="job-photo.jpg"','Content-Security-Policy':"default-src 'none'; sandbox"}});
      }
      if(!allowed)fail('Origin not allowed.',403);
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, X-Photo-Metadata','Access-Control-Max-Age':'600'}});
      if(request.method!=='POST'||!['/photos','/photos/upload'].includes(url.pathname))fail('Not found.',404);
      const token=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(request.headers.get('Authorization')||'')?.[1];if(!token)fail('Sign in to Shiftly first.',401);
      const upload=url.pathname.endsWith('/upload');
      if(request.headers.get('Content-Type')!==(upload?'image/jpeg':'application/json'))fail('Invalid content type.');
      const meta=request.headers.get('X-Photo-Metadata')||'';if(meta.length>10000)fail('Invalid photo details.');
      const d=upload?JSON.parse(decodeURIComponent(meta)):JSON.parse(new TextDecoder().decode(await readBounded(request,10000)));validate(d,upload);
      const context=await rpc(env,'jobs_r2_photo_context',{p_company_id:d.companyId,p_job_id:d.jobId,p_write:upload},token);
      if(context.company_id!==d.companyId || !UUID.test(context.actor_id||''))fail('Photo access denied.',403);
      if(!upload){
        const urls={};if(!d.photoIds.length)return json(200,{urls});
        const r=await fetcher(`${BASE}/rest/v1/job_photos?company_id=eq.${d.companyId}&job_id=eq.${d.jobId}&id=in.(${d.photoIds.join(',')})&select=id,object_path,storage_provider,storage_bucket`,{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
        if(!r.ok)fail('Photo access denied.',403);
        const signing=await signingKey(env),expires=Math.floor(Date.now()/1000)+300;
        for(const photo of await r.json()){
          if(!d.photoIds.includes(photo.id)||photo.storage_provider!=='r2'||photo.storage_bucket!==BUCKET)continue;
          const key=objectKey({...d,photoId:photo.id});if(photo.object_path!==key)continue;
          const sig=hex(await crypto.subtle.sign('HMAC',signing,encoder.encode(`${key}\n${expires}`)));
          const link=new URL('/image',url.origin);link.search=new URLSearchParams({company:d.companyId,job:d.jobId,photo:photo.id,expires:String(expires),sig}).toString();urls[photo.id]=link.href;
        }
        return json(200,{urls});
      }
      if(context.revision!==d.revision || !UUID.test(context.session_id||''))fail('Job changed. Reopen before uploading.',409);
      // Required binding: fail closed if omitted; rate limits are per Cloudflare location.
      if(!env.UPLOAD_LIMITER || !(await env.UPLOAD_LIMITER.limit({key:`${d.companyId}:${context.actor_id}`})).success)fail('Upload limit reached. Please wait a minute.',429);
      const bytes=sanitizeJpeg(await readBounded(request,2097152)),hash=hex(await crypto.subtle.digest('SHA-256',bytes)),key=objectKey(d);
      const stored=await env.PHOTOS.put(key,bytes,{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'image/jpeg'},customMetadata:{sha256:hash}});
      if(!stored){const existing=await env.PHOTOS.head(key);if(existing?.customMetadata?.sha256!==hash||existing?.size!==bytes.length)fail('Photo ID already used. Reopen the photo form.',409);}
      await rpc(env,'jobs_register_r2_photo',{p_company_id:d.companyId,p_job_id:d.jobId,p_revision:d.revision,p_actor:context.actor_id,p_session_id:context.session_id,p_photo_id:d.photoId,p_category:d.category,p_note:d.note.trim(),p_bytes:bytes.length,p_sha256:hash},token,true);
      return json(200,{id:d.photoId});
    } catch(error) {return json(error.status||502,{message:error.status?error.message:'Photo outcome could not be confirmed. Reopen the Job and check before retrying.'});}
  }};
}
export default createWorker();
