const test=require('node:test');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const company='11111111-1111-4111-8111-111111111111',job='22222222-2222-4222-8222-222222222222',photo='33333333-3333-4333-8333-333333333333',actor='44444444-4444-4444-8444-444444444444',session='55555555-5555-4555-8555-555555555555';
const host='https://shiftly-jobs-photos.fixture.workers.dev';
const data={companyId:company,jobId:job,photoId:photo,revision:1,category:'before',note:'hello'};
const jpeg=()=>sharp({create:{width:30,height:20,channels:3,background:'#abc'}}).jpeg().toBuffer();
async function fixture(options={}){
 const {createWorker}=await import('../workers/jobs-photos/index.mjs');
 const calls=[],objects=new Map(),writes=[];
 const env={ALLOWED_ORIGINS:'https://shiftlyapp.co.za',SUPABASE_ANON_KEY:'anon-fixture',SUPABASE_SERVICE_ROLE_KEY:'service-fixture',PHOTO_SIGNING_SECRET:'fixture-only-secret-'.repeat(3),UPLOAD_LIMITER:{limit:async()=>({success:!options.limited})},PHOTOS:{
  put:async(key,bytes,opts)=>{writes.push({key,opts});if(objects.has(key))return null;objects.set(key,{body:bytes,size:bytes.length,customMetadata:opts.customMetadata});return {};},
  head:async key=>objects.get(key),get:async key=>objects.get(key)
 }};
 const worker=createWorker(async(url,config)=>{
  calls.push({url,config});
  if(options.networkFail)throw new Error('private-service-fixture');
  if(url.endsWith('jobs_r2_photo_context'))return Response.json(options.denied?{code:'42501'}:{company_id:options.foreign||company,actor_id:actor,revision:1,session_id:session},{status:options.denied?403:200});
  if(url.endsWith('jobs_register_r2_photo'))return Response.json(options.finalFail?{code:'40001'}:photo,{status:options.finalFail?409:200});
  return Response.json([{id:photo,object_path:`${options.foreignPath||company}/${job}/photos/${photo}.jpg`,storage_provider:'r2',storage_bucket:'shiftly-jobs-test'}]);
 });
 const request=async(upload=false,overrides={},headers={})=>{
  const payload={...data,action:'view',photoIds:[photo],...overrides};
  return worker.fetch(new Request(host+(upload?'/photos/upload':'/photos'),{method:'POST',headers:{Origin:'https://shiftlyapp.co.za',Authorization:'Bearer test.jwt','Content-Type':upload?'image/jpeg':'application/json',...(upload?{'X-Photo-Metadata':encodeURIComponent(JSON.stringify(payload))}:{}),...headers},body:upload?await jpeg():JSON.stringify(payload)}),env);
 };
 return {worker,env,calls,objects,writes,request};
}
test('worker sanitizes metadata and rejects junk, oversized dimensions and trailing payloads',async()=>{
 const {sanitizeJpeg}=await import('../workers/jobs-photos/jpeg.mjs');
 const input=await sharp(await jpeg()).withMetadata().jpeg().toBuffer();
 const output=sanitizeJpeg(input);const meta=await sharp(output).metadata();
 assert.equal(meta.width,30);assert.equal(meta.exif,undefined);assert.equal(meta.icc,undefined);
 for(const bad of [Buffer.from('<svg/>'),Buffer.concat([await jpeg(),Buffer.from('extra')]),(await jpeg()).subarray(0,-3),await sharp({create:{width:1921,height:1,channels:3,background:'#fff'}}).jpeg().toBuffer()])assert.throws(()=>sanitizeJpeg(bad));
});
test('worker rejects bad origins, absent JWT and malformed scope before database access',async()=>{
 const f=await fixture();
 for(const [body,headers] of [[{}, {Origin:'https://evil.invalid'}],[{}, {Authorization:''}],[{companyId:'../other'},{}],[{jobId:'../other'},{}]])assert.ok((await f.request(false,body,headers)).status>=400);
 assert.equal(f.calls.length,0);
});
test('worker refuses missing secrets and missing upload limiter',async()=>{
 const f=await fixture();delete f.env.PHOTO_SIGNING_SECRET;assert.equal((await f.request()).status,503);
 const g=await fixture();delete g.env.UPLOAD_LIMITER;assert.equal((await g.request(true)).status,429);assert.equal(g.writes.length,0);
});
test('worker denies unauthorized, mismatched context and rate limited uploads without R2 writes',async()=>{
 for(const options of [{denied:true},{foreign:job},{limited:true}]){const f=await fixture(options);assert.ok((await f.request(true)).status>=400);assert.equal(f.writes.length,0);}
});
test('worker uses trusted actor, immutable scoped path and service-only finalization',async()=>{
 const f=await fixture();assert.equal((await f.request(true,{actor_id:job})).status,200);
 assert.equal(f.writes[0].key,`${company}/${job}/photos/${photo}.jpg`);assert.equal(f.writes[0].opts.onlyIf.etagDoesNotMatch,'*');
 const final=f.calls.at(-1),args=JSON.parse(final.config.body);assert.equal(args.p_actor,actor);assert.equal(args.p_session_id,session);assert.equal(args.p_company_id,company);
 assert.equal(final.config.headers.Authorization,'Bearer service-fixture');assert.equal(f.calls[0].config.headers.Authorization,'Bearer test.jwt');
});
test('worker refuses overwrite with different bytes and preserves object on uncertain finalization',async()=>{
 const f=await fixture();f.objects.set(`${company}/${job}/photos/${photo}.jpg`,{size:1,customMetadata:{sha256:'different'}});assert.equal((await f.request(true)).status,409);
 const g=await fixture({finalFail:true});assert.equal((await g.request(true)).status,409);assert.equal(g.objects.size,1);
 const h=await fixture({networkFail:true});assert.doesNotMatch(await (await h.request()).text(),/private-service/);
});
test('worker signs only RLS-visible matching paths; signed reads reject tampering and expiry',async()=>{
 const f=await fixture();await f.request(true);
 const result=await (await f.request()).json(),link=result.urls[photo];assert.ok(link.startsWith(host+'/image?'));
 const image=await f.worker.fetch(new Request(link),f.env);assert.equal(image.status,200);assert.equal(image.headers.get('cache-control'),'no-store');assert.equal(image.headers.get('content-type'),'image/jpeg');
 const tampered=new URL(link);tampered.searchParams.set('company',job);assert.equal((await f.worker.fetch(new Request(tampered),f.env)).status,403);
 tampered.searchParams.set('expires','1');assert.equal((await f.worker.fetch(new Request(tampered),f.env)).status,403);
 const g=await fixture({foreignPath:job});assert.deepEqual((await (await g.request()).json()).urls,{});
});
test('worker bounds streamed bodies and handles approved preflight only',async()=>{
 const {readBounded}=await import('../workers/jobs-photos/index.mjs');await assert.rejects(readBounded(new Request(host,{method:'POST',body:'12345'}),4),/large/);
 const f=await fixture();const res=await f.worker.fetch(new Request(host+'/photos',{method:'OPTIONS',headers:{Origin:'https://shiftlyapp.co.za'}}),f.env);assert.equal(res.status,204);assert.equal(res.headers.get('access-control-allow-origin'),'https://shiftlyapp.co.za');
});
test('rollout SQL changes only R2 functions, preserves locks and gates, no entitlement updates',()=>{
 const sql=fs.readFileSync('supabase/migrations/20260916090000_jobs_r2_enabled_companies.sql','utf8');
 assert.equal((sql.match(/create or replace function/g)||[]).length,2);assert.doesNotMatch(sql,/alter table|drop |update public\.companies|7e7aefc5/i);
 for(const guard of ['jobs_actor(p_company_id)','can_access_job(p_company_id,p_job_id)','jobs_enabled',"status='active'",'for update','for share','j.revision<>p_revision',"to service_role",'from public,anon,authenticated'])assert.ok(sql.includes(guard),guard);
});
