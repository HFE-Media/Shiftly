const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2] || 5184);
const host = process.argv[3] || "127.0.0.1";
const root = path.join(__dirname, "public");
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

  if (!filePath.startsWith(root)) {
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

    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(body);
  });
}).listen(port, host, () => {
  console.log(`Shiftly preview running at http://${host}:${port}/`);
});
