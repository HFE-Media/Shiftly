// Run only with explicit approval to transmit these credentials to Cloudflare.
// Refuses to replace an existing signing key: reruns must not rotate live links.
const {spawnSync}=require('node:child_process');
const {randomBytes}=require('node:crypto');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const cli=path.join(root,'workers/jobs-photos/node_modules/wrangler/bin/wrangler.js');
const config=path.join(root,'workers/jobs-photos/wrangler.jsonc');
const env={...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_ACCOUNT_ID:'5ce7344a2e9a58b6c28d5893bddead23'};
const previous=spawnSync(process.execPath,[cli,'secret','list','--config',config],{cwd:root,env,encoding:'utf8',windowsHide:true});
if(previous.status!==0)throw new Error('Could not verify existing Worker secrets. No credentials sent.');
if(previous.stdout.includes('PHOTO_SIGNING_SECRET'))throw new Error('Worker secrets already installed; refusing automatic replacement.');
process.loadEnvFile(path.join(root,'.env.jobs-photos.local'));
if(process.env.SUPABASE_URL!=='https://szougedvngaoratbtars.supabase.co')throw new Error('Wrong Supabase project.');
const secrets={SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY,PHOTO_SIGNING_SECRET:randomBytes(32).toString('hex')};
if(!secrets.SUPABASE_ANON_KEY||!secrets.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Missing private local configuration.');
const result=spawnSync(process.execPath,[cli,'secret','bulk','--config',config],{cwd:root,env,input:JSON.stringify(secrets),encoding:'utf8',windowsHide:true});
// Values never appear in command-line arguments, console output or a temp file.
if(result.status!==0){console.error('Secret installation did not report success. Inspect secret names before retrying.');process.exitCode=1;}
else console.log('Encrypted Worker secrets installed successfully (3 names; values withheld).');
