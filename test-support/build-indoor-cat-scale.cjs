// Measure original alpha silhouettes without modifying any artwork.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),contacts={};
function measure(file,rotation=0,flip=false){
 const png=fs.readFileSync(path.join(root,file)),w=png.readUInt32BE(16),h=png.readUInt32BE(20);
 if(png[24]!==8||png[25]!==6||png[28]!==0)throw Error('Expected non-interlaced RGBA8 PNG: '+file);
 const chunks=[];for(let i=8;i<png.length;){const n=png.readUInt32BE(i);if(png.toString('ascii',i+4,i+8)==='IDAT')chunks.push(png.subarray(i+8,i+8+n));i+=12+n;}
 const raw=zlib.inflateSync(Buffer.concat(chunks)),stride=w*4,prior=Buffer.alloc(stride),row=Buffer.alloc(stride),angle=rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 let offset=0,left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){
  const filter=raw[offset++];for(let x=0;x<stride;x++){const a=x>=4?row[x-4]:0,b=prior[x],d=x>=4?prior[x-4]:0;row[x]=(raw[offset++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,d)))&255;}
  for(let x=0;x<w;x++)if(row[x*4+3]>=16){
   if(!rotation){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
   else for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]]){const px=(x+dx-w/2)*(flip?-1:1),py=y+dy-h/2,rx=w/2+px*c-py*s,ry=h/2+px*s+py*c;left=Math.min(left,rx);right=Math.max(right,rx);top=Math.min(top,ry);bottom=Math.max(bottom,ry);}
  }row.copy(prior);
 }
 return {file,sha256:crypto.createHash('sha256').update(png).digest('hex'),width:w,height:h,left,top,right,bottom};
}
function add(key,file,rotation=0,flip=false){const a=measure(file,rotation,flip);contacts[key]=[a.width,a.height,a.left,a.top,a.right,a.bottom].map(n=>Number(n.toFixed(5)));}
for(const coat of fs.readdirSync(path.join(root,'assets/cat-refresh-v1')).filter(n=>fs.statSync(path.join(root,'assets/cat-refresh-v1',n)).isDirectory()).sort()){
 for(const pose of ['morning','night','day-relax','day-play','day-groom','day-doze'])add(coat+'/'+pose,'assets/cat-refresh-v1/'+coat+'/'+pose+'.png');
 add(coat+'/day-gaze-window','assets/window-gaze-v1/'+coat+'.png');
 for(const phase of ['before','after'])for(const i of [1,2,3])add('meal/'+coat+'/'+phase+'-'+i,'assets/cat-meals-v1/'+coat+'/'+phase+'-'+i+'.png');
}
for(const a of JSON.parse(fs.readFileSync(path.join(root,'assets/night-gestures-v1/manifest.json'),'utf8')))add('night/'+a.coat+'/'+a.pose,a.file,a.placement.rotation,a.placement.flip);
if(Object.keys(contacts).length!==256)throw Error('Expected 256 silhouette contacts');
const file=path.join(root,'indoor-cat-scale.js'),original=fs.readFileSync(file,'utf8'),next=original.replace(/ const contacts = .*;/,' const contacts = '+JSON.stringify(contacts)+';');
if(process.argv.includes('--check')){if(next!==original)throw Error('Run node test-support/build-indoor-cat-scale.cjs');console.log('PASS 256 unchanged original silhouette contacts');}else fs.writeFileSync(file,next);
