const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2] || 5184);
const host = process.argv[3] || "127.0.0.1";
const root = path.join(__dirname, "public");
const photoHandler = process.env.SHIFTLY_PHOTO_PILOT === '1'
  ? require('./server/jobs-photos.cjs').createPhotoHandler(process.env) : null;
if (photoHandler && (host !== '127.0.0.1' || port !== 5191)) throw new Error('Photo pilot requires 127.0.0.1:5191.');
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);
  if (url.pathname === '/api/jobs-photos') {
    if (photoHandler) { photoHandler(req, res); return; }
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ message: 'Start the local photo server first.' })); return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  const requested = pathname === "/"
    ? "index.html"
    : (pathname === "/login" || pathname === "/login/")
      ? "login.html"
      : (pathname === "/billing" || pathname === "/billing/")
        ? "billing.html"
      : pathname.slice(1);
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, body) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    // Distinct local URLs bypass previously cached Jobs assets without releasing
    // new public asset versions or altering the production service worker.
    if (process.env.SHIFTLY_PHOTO_WORKER_TEST === '1' && requested === 'login.html') {
      body = Buffer.from(body.toString('utf8').replace('</head>', '<script>window.SHIFTLY_JOBS_PHOTO_ENDPOINT="https://shiftly-jobs-photos.shiftly-static-app.workers.dev/photos";</script></head>').replace(/jobs-data\.js\?v=\d+/g, 'jobs-data.js?v=worker-test-1').replace(/jobs\.js\?v=\d+/g, 'jobs.js?v=worker-test-1').replace(/jobs\.css\?v=\d+/g, 'jobs.css?v=worker-test-1'));
    } else if (photoHandler && requested === 'login.html') {
      body = Buffer.from(body.toString('utf8').replace(/jobs-data\.js\?v=\d+/g, 'jobs-data.js?v=photo-pilot-1').replace(/jobs\.js\?v=\d+/g, 'jobs.js?v=photo-pilot-4').replace(/jobs\.css\?v=\d+/g, 'jobs.css?v=photo-pilot-4'));
    }

    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream", 'Cache-Control': 'no-store' });
    res.end(body);
  });
}).listen(port, host, () => {
  console.log(`Shiftly preview running at http://${host}:${port}/`);
});
