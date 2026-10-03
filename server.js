const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/app.js': 'app.js', '/nickname.js': 'nickname.js', '/cat-faces.js': 'cat-faces.js', '/cat-scenes.js': 'cat-scenes.js', '/favicon.svg': 'favicon.svg', '/tonight-trend.js': 'tonight-trend.js', '/sleep-flow.js': 'sleep-flow.js', '/supabase-config.js': 'supabase-config.js', '/supabase-api.js': 'supabase-api.js', '/vendor/supabase.js': 'vendor/supabase.js' };
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  res.setHeader('Content-Type', types[path.extname(file)] + '; charset=utf-8');
  fs.createReadStream(path.join(__dirname, file)).pipe(res);
}).listen(3000, '127.0.0.1', () => console.log('おやすみ: http://localhost:3000'));
