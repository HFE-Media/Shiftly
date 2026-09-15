const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const secretFile = path.join(root, '.env.jobs-photos.local');
if (!fs.existsSync(secretFile)) {
  console.error('Create .env.jobs-photos.local from .env.jobs-photos.example and fill it privately first.');
  process.exitCode = 1;
} else {
  const child = spawn(process.execPath, ['--env-file=' + secretFile, path.join(root, 'dev-server.js'), '5191'], {
    cwd: root, env: { ...process.env, SHIFTLY_PHOTO_PILOT: '1' }, stdio: 'inherit', windowsHide: true
  });
  child.on('exit', code => { process.exitCode = code || 0; });
}
