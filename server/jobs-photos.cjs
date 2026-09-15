// Local pilot only. Never serve this directory or credentials as static assets.
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');
const { createHash } = require('node:crypto');
const COMPANY = '7e7aefc5-52c2-4cc7-b649-cf255af8c2e3';
const BUCKET = 'shiftly-jobs-test';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_BODY = 12 * 1024 * 1024;
function reject(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function validate(data) {
  if (data.companyId !== COMPANY) reject('Photo testing is restricted to Demo Company Name.', 403);
  if (!UUID.test(data.jobId || '')) reject('Invalid Job.');
  if (!['upload', 'view'].includes(data.action)) reject('Unknown photo action.');
  if (data.action === 'view' && (!Array.isArray(data.photoIds) || data.photoIds.length > 100 || !data.photoIds.every(id => UUID.test(id)))) reject('Invalid photo IDs.');
  if (data.action === 'upload') {
    if (!UUID.test(data.photoId || '')) reject('Invalid photo ID.');
    if (!Number.isSafeInteger(data.revision) || data.revision < 1) reject('Refresh the Job first.');
    if (!['before', 'during', 'after', 'other'].includes(data.category)) reject('Choose a photo category.');
    if (typeof data.note !== 'string' || data.note.length > 500) reject('Photo note must be at most 500 characters.');
    if (typeof data.image !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.image)) reject('Choose an image.');
  }
}
async function prepareImage(base64) {
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) reject('Photo must be smaller than 8 MB.');
  try {
    const options = { limitInputPixels: 40000000, failOn: 'warning' };
    const metadata = await sharp(bytes, options).metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) !== 1) reject('Use a still JPEG, PNG or WebP photo.');
    // Decode/re-encode, auto-orient and discard metadata (including GPS/EXIF).
    const result = await sharp(bytes, options).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    if (result.length > 2 * 1024 * 1024) reject('Photo is too detailed. Please choose a smaller image.');
    return result;
  } catch (error) { if (error.status) throw error; reject('This image could not be read. Use JPEG, PNG or WebP.'); }
}
function createPhotoHandler(env, dependencies = {}) {
  const fetcher = dependencies.fetch || fetch;
  const configured = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].every(key => env[key]);
  const base = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const configValid = configured && /^[a-f0-9]{32}$/.test(env.R2_ACCOUNT_ID) && base === 'https://szougedvngaoratbtars.supabase.co';
  const s3 = dependencies.s3 || (configValid ? new S3Client({ region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY }, maxAttempts: 1, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' }) : null);
  const sign = dependencies.sign || getSignedUrl;
  let active = 0;
  const users = new Set();
  async function rpc(name, body, token, privileged = false) {
    const response = await fetcher(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: privileged ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY, Authorization: `Bearer ${privileged ? env.SUPABASE_SERVICE_ROLE_KEY : token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok) {
      if (result.code === 'PGRST202') reject('Photo database setup has not been applied yet.', 503);
      if (result.code === '40001') reject('Job changed. Refresh and check the photos before retrying.', 409);
      if (response.status === 401 || response.status === 403 || result.code === '42501') reject('Photo access denied. Check your company, assignment and session.', 403);
      reject('Photo could not be registered. Refresh the Job before retrying.', 409);
    }
    return result;
  }
  async function operation(data, token) {
    validate(data);
    const context = await rpc('jobs_r2_photo_context', { p_company_id: COMPANY, p_job_id: data.jobId, p_write: data.action === 'upload' }, token);
    if (context.company_id !== COMPANY || !UUID.test(context.actor_id || '')) reject('Photo access denied.', 403);
    if (data.action === 'view') {
      // Only sign registered objects returned through caller-scoped RLS.
      if (!data.photoIds.length) return { urls: {} };
      const response = await fetcher(`${base}/rest/v1/job_photos?company_id=eq.${COMPANY}&job_id=eq.${data.jobId}&id=in.(${data.photoIds.join(',')})&select=id,object_path,storage_provider,storage_bucket`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) reject('Photo unavailable.', 403);
      const urls = {};
      for (const photo of await response.json()) {
        const key = `${COMPANY}/${data.jobId}/photos/${photo.id}.jpg`;
        if (!data.photoIds.includes(photo.id) || photo.storage_provider !== 'r2' || photo.storage_bucket !== BUCKET || photo.object_path !== key) continue;
        urls[photo.id] = await sign(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 300 });
      }
      return { urls };
    }
    if (users.has(context.actor_id) || active >= 3) reject('An upload is already running. Please wait.', 429);
    if (context.revision !== data.revision) reject('Job changed. Refresh before uploading.', 409);
    users.add(context.actor_id); active++;
    try {
      const bytes = await prepareImage(data.image);
      const hash = createHash('sha256').update(bytes).digest('hex');
      const key = `${COMPANY}/${data.jobId}/photos/${data.photoId}.jpg`;
      // Conditional writes prevent an accepted image from being overwritten.
      try { await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: 'image/jpeg', IfNoneMatch: '*', Metadata: { sha256: hash } }), { abortSignal: AbortSignal.timeout(30000) }); }
      catch (error) {
        if (error.$metadata?.httpStatusCode !== 412) throw error;
        const existing = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }), { abortSignal: AbortSignal.timeout(15000) });
        if (existing.Metadata?.sha256 !== hash || existing.ContentLength !== bytes.length) reject('Photo ID already used. Close this form and choose the photo again.', 409);
      }
      // Never remove an object on an uncertain database outcome: it may be registered.
      await rpc('jobs_register_r2_photo', { p_company_id: COMPANY, p_job_id: data.jobId, p_revision: data.revision, p_actor: context.actor_id, p_session_id: context.session_id, p_photo_id: data.photoId, p_category: data.category, p_note: data.note.trim(), p_bytes: bytes.length, p_sha256: hash }, token, true);
      return { id: data.photoId };
    } finally { users.delete(context.actor_id); active--; }
  }
  return async function handle(req, res) {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    if (req.method !== 'POST') { send(405, { message: 'POST required.' }); return; }
    if (!['127.0.0.1:5191', 'localhost:5191'].includes(req.headers.host) || req.headers.origin !== `http://${req.headers.host}`) { send(403, { message: 'Local test origin required.' }); return; }
    if (!configValid) { send(503, { message: 'Local photo credentials are not configured yet.' }); return; }
    const token = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) { send(401, { message: 'Sign in to Shiftly first.' }); return; }
    try {
      if (!String(req.headers['content-type']).startsWith('application/json')) reject('JSON required.');
      let size = 0; const chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) reject('Photo too large.', 413); chunks.push(chunk); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!data || Array.isArray(data)) reject('Invalid request.');
      send(200, await operation(data, token));
    } catch (error) {
      // Do not expose AWS responses, database details, URLs, tokens or SDK errors.
      send(error.status || 502, { message: error.status ? error.message : 'Upload outcome could not be confirmed. Refresh the Job and check its photos before retrying.' });
    }
  };
}
module.exports = { createPhotoHandler, prepareImage, validate, COMPANY, BUCKET };
