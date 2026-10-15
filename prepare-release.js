const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Git normalizes text line endings; releases must match on Windows and Pages.
const normalize=value=>value.toString().replace(/\r\n/g,'\n');
const root=__dirname, hash=value=>crypto.createHash('sha256').update(normalize(value)).digest('hex').slice(0,16);
const assetFile=path.join(root,'wild-cat-assets.js');
const assetOriginal=normalize(fs.readFileSync(assetFile,'utf8'));
const assetHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/wild-cats')).filter(file=>file.endsWith('.png')).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/wild-cats',file))).digest('hex').slice(0,16)]));
const assetUpdated=assetOriginal.replace(/const versions = .*;/,`const versions = ${JSON.stringify(assetHashes)};`);
if(process.argv.includes('--check')&&assetUpdated!==assetOriginal){console.error('Run npm run release to version wild cat images.');process.exitCode=1;}
else if(!process.argv.includes('--check')&&assetUpdated!==assetOriginal)fs.writeFileSync(assetFile,assetUpdated);
const domesticFile=path.join(root,'cat-faces.js');
const domesticOriginal=normalize(fs.readFileSync(domesticFile,'utf8'));
const domesticHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/domestic-cats')).filter(file=>file.endsWith('.png')).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/domestic-cats',file))).digest('hex').slice(0,16)]));
const bigHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/big-cats')).filter(file=>file.endsWith('.png')).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/big-cats',file))).digest('hex').slice(0,16)]));
const domesticUpdated=domesticOriginal.replace(/const domesticVersions = .*;/,`const domesticVersions = ${JSON.stringify(domesticHashes)};`).replace(/const bigVersions = .*;/,`const bigVersions = ${JSON.stringify(bigHashes)};`);
if(process.argv.includes('--check')&&domesticUpdated!==domesticOriginal){console.error('Run npm run release to version domestic cat images.');process.exitCode=1;}
else if(!process.argv.includes('--check')&&domesticUpdated!==domesticOriginal)fs.writeFileSync(domesticFile,domesticUpdated);
const original=normalize(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const scenesFile=path.join(root,'cat-scenes.js');
const scenesOriginal=normalize(fs.readFileSync(scenesFile,'utf8'));
const scenesHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/sleep-wake-cats')).filter(file=>/^[a-z-]+-(?:sleeping|waking)\.png$/.test(file)).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/sleep-wake-cats',file))).digest('hex').slice(0,16)]));
const scenesUpdated=scenesOriginal.replace(/const sceneVersions = .*;/,`const sceneVersions = ${JSON.stringify(scenesHashes)};`);
if(process.argv.includes('--check')&&scenesUpdated!==scenesOriginal){console.error('Run npm run release to version sleep/wake cat images.');process.exitCode=1;}
else if(!process.argv.includes('--check')&&scenesUpdated!==scenesOriginal)fs.writeFileSync(scenesFile,scenesUpdated);
const dayFile=path.join(root,'cat-day-scenes.js');
const dayOriginal=normalize(fs.readFileSync(dayFile,'utf8'));
const dayHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/day-cats')).filter(file=>/^[a-z-]+-(?:relax|play|groom|doze|gaze)\.png$/.test(file)).sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/day-cats',file))).digest('hex').slice(0,16)]));
const dayUpdated=dayOriginal.replace(/const dayImageVersions = .*;/,`const dayImageVersions = ${JSON.stringify(dayHashes)};`);
if(process.argv.includes('--check')&&dayUpdated!==dayOriginal){console.error('Run npm run release to version day cat images.');process.exitCode=1;}
else if(!process.argv.includes('--check')&&dayUpdated!==dayOriginal)fs.writeFileSync(dayFile,dayUpdated);
let html=original.replace(/\s*<meta name="oyasumi-release" content="[^"]*">/g,'');
const mealFile=path.join(root,'cat-meal-assets.js');
const mealOriginal=normalize(fs.readFileSync(mealFile,'utf8'));
const mealHashes={};
for(const coat of fs.readdirSync(path.join(root,'assets/cat-meals-v1')).filter(coat=>/^[a-z-]+$/.test(coat)).sort())for(const file of fs.readdirSync(path.join(root,'assets/cat-meals-v1',coat)).filter(file=>/^(?:before|after)-[123]\.png$/.test(file)).sort())mealHashes[coat+'/'+file.replace(/\.png$/,'')]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/cat-meals-v1',coat,file))).digest('hex').slice(0,16);
if(Object.keys(mealHashes).length!==96)throw Error('Expected exactly 96 approved meal images');
const mealUpdated=mealOriginal.replace(/const versions = .*;/,`const versions = ${JSON.stringify(mealHashes)};`);
if(process.argv.includes('--check')&&mealUpdated!==mealOriginal){console.error('Run npm run release to version meal images.');process.exitCode=1;}
else if(!process.argv.includes('--check')&&mealUpdated!==mealOriginal)fs.writeFileSync(mealFile,mealUpdated);
const gazeFile=path.join(root,'cat-image-assets.js');
const gazeOriginal=normalize(fs.readFileSync(gazeFile,'utf8'));
const gazeHashes=Object.fromEntries(fs.readdirSync(path.join(root,'assets/window-gaze-v1')).filter(file=>/^[a-z-]+\.png$/.test(file)).sort().map(file=>[file.replace(/\.png$/,''),crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/window-gaze-v1',file))).digest('hex').slice(0,16)]));
if(Object.keys(gazeHashes).length!==16)throw Error('Expected exactly 16 window-gazing cat images');
const gazeUpdated=gazeOriginal.replace(/const windowGazeVersions = .*;/,`const windowGazeVersions = ${JSON.stringify(gazeHashes)};`);
if(process.argv.includes('--check')&&gazeUpdated!==gazeOriginal){console.error('Run npm run release to version window-gazing images.');process.exitCode=1;}
else if(!process.argv.includes('--check')&&gazeUpdated!==gazeOriginal)fs.writeFileSync(gazeFile,gazeUpdated);
const roofFile=path.join(root,'roof-recline.js'),roofOriginal=normalize(fs.readFileSync(roofFile,'utf8'));
const roofManifest=JSON.parse(fs.readFileSync(path.join(root,'assets/roof-recline-v1/manifest.json'),'utf8'));
if(roofManifest.length!==16)throw Error('Expected 16 reclining rooftop cats');
const roofAssets=Object.fromEntries(roofManifest.map(entry=>{
 const version=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,entry.file))).digest('hex');
 if(version!==entry.sha256)throw Error('Rebuild reclining image metadata: '+entry.coat);
 return [entry.coat,{version:version.slice(0,16),reclining:entry.reclining,seated:entry.seated}];
}));
const roofUpdated=roofOriginal.replace(/const assets = .*;/,`const assets = ${JSON.stringify(roofAssets)};`);
if(process.argv.includes('--check')&&roofUpdated!==roofOriginal){console.error('Run npm run release to version reclining cats.');process.exitCode=1;}
else if(!process.argv.includes('--check')&&roofUpdated!==roofOriginal)fs.writeFileSync(roofFile,roofUpdated);
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
