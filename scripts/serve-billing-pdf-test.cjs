const http = require('node:http');
const fs = require('node:fs');
const routes = {
  '/': ['tmp/pdfs/harness.html','text/html'],
  '/vendor/billing-pdf.js': ['public/vendor/billing-pdf.js','text/javascript'],
  '/test-logo.png': ['public/icons/shiftly-favicon-192.png','image/png']
};
http.createServer((req,res)=>{
  const route=routes[new URL(req.url,'http://127.0.0.1').pathname];
  if(!route){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':route[1]+'; charset=utf-8','Cache-Control':'no-store'});
  fs.createReadStream(route[0]).pipe(res);
}).listen(5187,'127.0.0.1',()=>console.log('Billing PDF test at http://127.0.0.1:5187'));
