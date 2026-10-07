const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Git normalizes text line endings; releases must match on Windows and Pages.
const normalize=value=>value.toString().replace(/\r\n/g,'\n');
const root=__dirname, hash=value=>crypto.createHash('sha256').update(normalize(value)).digest('hex').slice(0,16);
const assetFile=path.join(root,'wild-cat-assets.js');
const assetOriginal=normalize(fs.readFileSync(assetFile,'utf8'));
const assetHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/wild-cats')).filter(file=>file.endsWith('.png')).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/wild-cats',file))).digest('hex').slice(0,16)]));
const assetUpdated=assetOriginal.replace(/const versions = .*;/,`const versions = ${JSON.stringify(assetHashes)};`);
if(process.argv.includes('--check')&&assetUpdated!==assetOriginal){console.error('Run npm run release to version wild cat images.');process.exitCode=1;}
else if(!process.argv.includes('--check'))fs.writeFileSync(assetFile,assetUpdated);
const domesticFile=path.join(root,'cat-faces.js');
const domesticOriginal=normalize(fs.readFileSync(domesticFile,'utf8'));
const domesticHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/domestic-cats')).filter(file=>file.endsWith('.png')).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/domestic-cats',file))).digest('hex').slice(0,16)]));
const bigHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/big-cats')).filter(file=>file.endsWith('.png')).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/big-cats',file))).digest('hex').slice(0,16)]));
const domesticUpdated=domesticOriginal.replace(/const domesticVersions = .*;/,`const domesticVersions = ${JSON.stringify(domesticHashes)};`).replace(/const bigVersions = .*;/,`const bigVersions = ${JSON.stringify(bigHashes)};`);
if(process.argv.includes('--check')&&domesticUpdated!==domesticOriginal){console.error('Run npm run release to version domestic cat images.');process.exitCode=1;}
else if(!process.argv.includes('--check'))fs.writeFileSync(domesticFile,domesticUpdated);
const original=normalize(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const scenesFile=path.join(root,'cat-scenes.js');
const scenesOriginal=normalize(fs.readFileSync(scenesFile,'utf8'));
const scenesHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/sleep-wake-cats')).filter(file=>/^[a-z-]+-(?:sleeping|waking)\.png$/.test(file)).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/sleep-wake-cats',file))).digest('hex').slice(0,16)]));
const scenesUpdated=scenesOriginal.replace(/const sceneVersions = .*;/,`const sceneVersions = ${JSON.stringify(scenesHashes)};`);
if(process.argv.includes('--check')&&scenesUpdated!==scenesOriginal){console.error('Run npm run release to version sleep/wake cat images.');process.exitCode=1;}
else if(!process.argv.includes('--check'))fs.writeFileSync(scenesFile,scenesUpdated);
let html=original.replace(/\s*<meta name="oyasumi-release" content="[^"]*">/g,'');
const resources=new Map();
html=html.replace(/(src|href)="([^"?#]+)(?:\?[^"#]*)?"/g,(match,attribute,file)=>{
 if(!/\.(?:js|css|svg)$/.test(file)||/^(?:https?:|\/\/)/.test(file))return match;
 const version=hash(fs.readFileSync(path.join(root,file)));resources.set(file,version);
 return `${attribute}="${file}?v=${version}"`;
});
const release=hash(html+JSON.stringify([...resources]));
html=html.replace('<meta charset="utf-8">',`<meta charset="utf-8">\n  <meta name="oyasumi-release" content="${release}">`);
const manifest=JSON.stringify({release})+'\n';
if(process.argv.includes('--check')){
 if(html!==original||!fs.existsSync(path.join(root,'release.json'))||fs.readFileSync(path.join(root,'release.json'),'utf8')!==manifest){
  console.error('Run npm run release before publishing changed files.');process.exitCode=1;
 }else console.log('PASS release: every asset URL and deployment marker match file contents.');
}else{
 fs.writeFileSync(path.join(root,'index.html'),html);fs.writeFileSync(path.join(root,'release.json'),manifest);
 console.log('Prepared release '+release);
}
