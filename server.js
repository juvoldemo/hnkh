const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const configScript = require('./config')();
const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/advisors-data.js':'advisors-data.js','/advisor-picker.js':'advisor-picker.js','/cloud.js':'cloud.js','/logo.png':'logo.png'};
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
http.createServer((req,res)=>{if(new URL(req.url,'http://localhost').pathname==='/supabase-config.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});return res.end(configScript);}const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);return res.end('Not found');}fs.readFile(path.join(__dirname,file),(err,data)=>{if(err){res.writeHead(500);return res.end('Server error');}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache'});res.end(data);});}).listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('Hoi Ngo: http://localhost:'+(process.env.PORT||3000)));
