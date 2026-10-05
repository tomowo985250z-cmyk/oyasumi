const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/app.js': 'app.js', '/safety.js': 'safety.js', '/update-client.js': 'update-client.js', '/release.json': 'release.json', '/nickname.js': 'nickname.js', '/cat-faces.js': 'cat-faces.js', '/cat-roles.js': 'cat-roles.js', '/cat-scenes.js': 'cat-scenes.js', '/cat-day-scenes.js': 'cat-day-scenes.js', '/favicon.svg': 'favicon.svg', '/tonight-trend.js': 'tonight-trend.js', '/sleep-flow.js': 'sleep-flow.js', '/night-clock.js': 'night-clock.js', '/supabase-config.js': 'supabase-config.js', '/supabase-api.js': 'supabase-api.js', '/vendor/supabase.js': 'vendor/supabase.js' };
const types = { '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
files['/wild-cat-assets.js']='wild-cat-assets.js';
for(const file of fs.readdirSync(path.join(__dirname,'assets/wild-cats')))if(/^[a-z-]+\.png$/.test(file))files['/assets/wild-cats/'+file]='assets/wild-cats/'+file;
types['.png']='image/png';
for(const file of fs.readdirSync(path.join(__dirname,'assets/day-cats')))if(/^[a-z-]+\.png$/.test(file))files['/assets/day-cats/'+file]='assets/day-cats/'+file;
http.createServer((req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  res.setHeader('Content-Type', types[path.extname(file)] + (file.endsWith('.png')?'':'; charset=utf-8'));
  fs.createReadStream(path.join(__dirname, file)).pipe(res);
}).listen(3000, '127.0.0.1', () => console.log('おやすみ: http://localhost:3000'));
