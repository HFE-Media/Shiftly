const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const fs = require('node:fs');
const vm = require('node:vm');
const sharp = require('sharp');
const { createPhotoHandler, prepareImage, validate, COMPANY, BUCKET } = require('../server/jobs-photos.cjs');
const job = '11111111-1111-4111-8111-111111111111', photo = '22222222-2222-4222-8222-222222222222', actor = '33333333-3333-4333-8333-333333333333';
// Synthetic credentials: all network/storage operations are injected fakes.
const env = { R2_ACCOUNT_ID: 'a'.repeat(32), R2_ACCESS_KEY_ID: 'fixture', R2_SECRET_ACCESS_KEY: 'fixture', SUPABASE_URL: 'https://szougedvngaoratbtars.supabase.co', SUPABASE_ANON_KEY: 'fixture-anon', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service' };
const context = { company_id: COMPANY, actor_id: actor, revision: 1, session_id: '44444444-4444-4444-8444-444444444444' };
const view = { action: 'view', companyId: COMPANY, jobId: job, photoIds: [photo] };
const image = () => sharp({ create: { width: 30, height: 20, channels: 3, background: '#abc' } }).png().toBuffer();
const upload = async () => ({ action: 'upload', companyId: COMPANY, jobId: job, photoId: photo, revision: 1, category: 'before', note: 'test', image: (await image()).toString('base64') });
async function call(handler, data, headers = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(data))]); req.method = 'POST';
  req.headers = { host: '127.0.0.1:5191', origin: 'http://127.0.0.1:5191', authorization: 'Bearer fixture.jwt', 'content-type': 'application/json', ...headers };
  const res = { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = JSON.parse(body); } };
  await handler(req, res); return res;
}
function fake(options = {}) {
  const calls = [], objects = [], signed = [];
  const handler = createPhotoHandler(env, {
    fetch: async (url, config) => {
      calls.push({ url, config });
      if (options.fetch) return options.fetch(url, config);
      if (url.endsWith('jobs_r2_photo_context')) return { ok: true, json: async () => context };
      if (url.endsWith('jobs_register_r2_photo')) return { ok: true, json: async () => photo };
      return { ok: true, json: async () => [{ id: photo, object_path: `${COMPANY}/${job}/photos/${photo}.jpg`, storage_provider: 'r2', storage_bucket: BUCKET }] };
    },
    s3: { send: async command => { objects.push(command); if (options.send) return options.send(command); return {}; } },
    sign: async (s3, command, config) => { signed.push({ command, config }); return 'https://example.invalid/photo'; }
  });
  return { handler, calls, objects, signed };
}
test('invalid scope, IDs, categories and notes fail before network', async () => {
  const f = fake();
  for (const data of [{ ...view, companyId: job }, { ...view, jobId: '../evil' }, { ...view, photoIds: ['../evil'] }, { ...await upload(), category: 'anything' }, { ...await upload(), note: 'x'.repeat(501) }]) assert.equal((await call(f.handler, data)).status >= 400, true);
  assert.equal(f.calls.length, 0); assert.equal(f.objects.length, 0);
});
test('local Host and Origin and bearer required; missing configuration fails closed', async () => {
  const f = fake();
  for (const headers of [{ host: 'evil.example' }, { origin: 'https://evil.example' }, { authorization: '' }]) assert.ok((await call(f.handler, view, headers)).status >= 400);
  assert.equal(f.calls.length, 0);
  assert.equal((await call(createPhotoHandler({}), view)).status, 503);
});
test('actual image decoder rejects SVG and junk; output is JPEG without metadata', async () => {
  await assert.rejects(prepareImage(Buffer.from('<svg/>').toString('base64')));
  await assert.rejects(prepareImage(Buffer.from('not an image').toString('base64')));
  const bytes = await prepareImage((await image()).toString('base64'));
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.exif, undefined); assert.equal(metadata.width, 30);
});
test('large dimensions are resized; encoded payload size is bounded', async () => {
  const bytes = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: 'blue' } }).jpeg().toBuffer();
  assert.equal((await sharp(await prepareImage(bytes.toString('base64'))).metadata()).width, 1920);
  await assert.rejects(prepareImage(Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64')), /smaller/);
});
test('caller authorization precedes R2; service credentials used only for final registration', async () => {
  const f = fake(); const data = await upload(); data.actor_id = job;
  const res = await call(f.handler, data);
  assert.equal(res.status, 200); assert.equal(f.objects.length, 1);
  assert.equal(f.objects[0].input.Bucket, BUCKET); assert.equal(f.objects[0].input.IfNoneMatch, '*');
  assert.equal(f.objects[0].input.ContentType, 'image/jpeg');
  assert.equal(f.calls[0].config.headers.Authorization, 'Bearer fixture.jwt');
  const registration = f.calls.find(c => c.url.endsWith('jobs_register_r2_photo'));
  assert.equal(JSON.parse(registration.config.body).p_actor, actor);
  assert.equal(registration.config.headers.Authorization, 'Bearer fixture-service');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('denied and stale uploads do not write R2', async () => {
  const denied = fake({ fetch: async () => ({ ok: false, status: 403, json: async () => ({ code: '42501' }) }) });
  assert.equal((await call(denied.handler, await upload())).status, 403); assert.equal(denied.objects.length, 0);
  const stale = fake(); assert.equal((await call(stale.handler, { ...await upload(), revision: 99 })).status, 409); assert.equal(stale.objects.length, 0);
});
test('private viewing signs only database-authorized matching paths, for five minutes', async () => {
  const f = fake(); const res = await call(f.handler, view);
  assert.equal(res.status, 200); assert.equal(res.body.urls[photo], 'https://example.invalid/photo');
  assert.equal(f.signed[0].config.expiresIn, 300); assert.equal(f.objects.length, 0);
  assert.ok(f.calls[1].url.includes('company_id=eq.' + COMPANY));
});
test('foreign paths are never signed', async () => {
  const f = fake({ fetch: async url => ({ ok: true, json: async () => url.endsWith('jobs_r2_photo_context') ? context : [{ id: photo, object_path: `other/${photo}`, storage_provider: 'r2', storage_bucket: BUCKET }] }) });
  assert.deepEqual((await call(f.handler, view)).body.urls, {}); assert.equal(f.signed.length, 0);
});
test('existing object cannot be replaced with different bytes', async () => {
  const f = fake({ send: async cmd => { if (cmd.constructor.name === 'PutObjectCommand') throw { $metadata: { httpStatusCode: 412 } }; return { Metadata: { sha256: 'different' }, ContentLength: 20 }; } });
  assert.equal((await call(f.handler, await upload())).status, 409);
  assert.equal(f.calls.length, 1);
});
test('unknown database outcome retains object and does not leak upstream errors', async () => {
  const f = fake({ fetch: async url => { if (url.endsWith('jobs_register_r2_photo')) throw new Error('private-upstream-detail'); return { ok: true, json: async () => context }; } });
  const res = await call(f.handler, await upload()); assert.equal(res.status, 502);
  assert.doesNotMatch(JSON.stringify(res.body), /private-upstream-detail/);
  assert.equal(f.objects.length, 1);
});
test('SQL is additive, pilot-scoped, service-only finalization with revision/session/history guards', () => {
  const sql = fs.readFileSync('supabase/migrations/20260915120000_jobs_r2_photo_pilot.sql', 'utf8');
  assert.match(sql, /grant execute on function public.jobs_register_r2_photo\([^;]+to service_role/);
  assert.match(sql, /revoke all on function public.jobs_register_r2_photo\([^;]+from public,anon,authenticated/);
  for (const token of ['for share', 'for update', 'ended_at is null', 'unassigned_at is null', 'j.revision<>p_revision', 'existing.sha256=p_sha256', 'public.job_activity', 'public.jobs_touch', COMPANY]) assert.ok(sql.includes(token), token);
  assert.doesNotMatch(sql, /create or replace|update public.companies|storage\.objects|drop /i);
});
test('adapter enables photos only in explicitly opted-in local demo-company context', () => {
  function adapter(host, company = COMPANY, opt = true) {
    const sandbox = { window: {}, location: { hostname: host } }; vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync('public/jobs-data.js', 'utf8'), sandbox);
    return sandbox.window.ShiftlyJobsData.createSupabase({ client: {}, getContext: () => ({ companyId: company, userId: actor, role: 'supervisor', employeeId: 'E1', jobsEnabled: true }), execution: true, photoPilot: opt });
  }
  assert.equal(adapter('127.0.0.1').capabilities.photos, true);
  for (const a of [adapter('shiftlyapp.co.za'), adapter('127.0.0.1', job), adapter('localhost', COMPANY, false)]) assert.equal(a.addPhoto, undefined);
  assert.equal(adapter('localhost').capabilities.mediaPersistence, false);
});
test('adapter drops an upload before sending when company changes during file reading', async () => {
  let companyId = COMPANY, finishRead, requests = 0;
  const sandbox = { window: {}, location: { hostname: 'localhost' }, btoa: value => Buffer.from(value, 'binary').toString('base64'), AbortSignal, fetch: async () => { requests++; assert.fail('Must not upload after switch'); } };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('public/jobs-data.js', 'utf8'), sandbox);
  const adapter = sandbox.window.ShiftlyJobsData.createSupabase({ client: {}, getContext: () => ({ companyId, userId: actor, role: 'supervisor', employeeId: 'E1', jobsEnabled: true }), execution: true, photoPilot: true });
  const pending = adapter.addPhoto(job, 1, { file: { size: 1, type: 'image/jpeg', arrayBuffer: () => new Promise(resolve => { finishRead = resolve; }) } });
  companyId = job; finishRead(new ArrayBuffer(1));
  await assert.rejects(pending, /Company or session changed/); assert.equal(requests, 0);
});
test('photo markup keeps compact controls, escapes notes and renders full image in print', () => {
  const source = fs.readFileSync('public/jobs.js', 'utf8');
  const imageFn = source.slice(source.indexOf('  function photoImage('), source.indexOf('  function photosTab('));
  const photoFn = source.slice(source.indexOf('  function photosTab('), source.indexOf('  function notesTab('));
  const sandbox = { h: s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'), photosAvailable: () => true, role: 'supervisor', panel: (a,b,c,d='') => c+d, localDateTime: () => 'today', empty: () => 'empty' };
  vm.createContext(sandbox); vm.runInContext(imageFn + photoFn, sandbox);
  const p = { category: 'before', note: '<script>bad</script>', photoUrl: 'https://example.invalid/photo' };
  const html = sandbox.photosTab({ photos: [p] }, false);
  assert.match(html, /jobsBtn small secondary/); assert.match(html, /&lt;script>/); assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(sandbox.photosTab({ photos: [p] }, true), /data-action="add-photo"/);
  assert.match(sandbox.photoImage(p, true), /height:auto;object-fit:contain/);
  assert.doesNotMatch(sandbox.photoImage({ ...p, photoUrl: 'javascript:alert(1)' }), /<img/);
  const paper = sandbox.paperPhotos({ photos: [{ ...p, note: '  ' }] });
  assert.match(paper, /1 photo<\/p>/);
  assert.match(paper, />Before<\/figcaption>/);
  assert.doesNotMatch(paper, /photo record| · /);
  assert.match(paper, /jobsPaperPhotoStart"><h3>Photos/);
  const five = sandbox.paperPhotos({photos: Array.from({length:5}, () => p)});
  assert.equal((five.match(/class="jobsPaperPhotoRow"/g)||[]).length, 3);
  assert.equal((five.match(/class="jobsPaperPhoto"/g)||[]).length, 5);
  assert.equal((five.match(/class="jobsPaperPhotoSpacer"/g)||[]).length, 1);
  const css = fs.readFileSync('public/jobs.css','utf8');
  assert.match(css, /\.jobsPaperPhotoRow \{ display: table; table-layout: fixed/);
  assert.match(css, /height: 65mm !important; object-fit: contain !important/);
  assert.match(sandbox.paperPhotos({ photos: [p, p] }), /2 photos<\/p>/);
  assert.match(sandbox.paperPhotos({ photos: [p] }), /Before · &lt;script>/);
  const preview = sandbox.photoPreview({ photos: Array.from({length:7}, (_,id) => ({...p,id:String(id)})) });
  assert.equal((preview.match(/data-action="photo-gallery"/g)||[]).length,3);
  assert.match(preview, />\+4<\/span>/);
  assert.doesNotMatch(sandbox.photoPreview({photos:[p]}), /jobsPhotoMore/);
});
