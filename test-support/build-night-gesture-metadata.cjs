// Read-only PNG analysis. Preserve generated pixel data and transparency.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require('../output/webkit-tools/core/package/lib/utilsBundle');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'assets/night-gestures-v1');
const coats=['calico','orange','brown','silver','black','white','tuxedo','gray','manul','sand','black-footed','fishing','snow-leopard','leopard','cheetah','jaguar'];
const choices={curl:{visibleWidth:132,center:198,contactY:251},stretch:{visibleWidth:154,center:182,contactY:277},window:{visibleWidth:118,center:83,contactY:161,flip:true,rotation:6}};
const manifest=[];
for(const coat of coats)for(const [pose,choice] of Object.entries(choices)){
 const file=`assets/night-gestures-v1/${coat}-${pose}.png`,bytes=fs.readFileSync(path.join(root,file)),png=PNG.sync.read(bytes);
 const angle=(choice.rotation||0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),cx=png.width/2,cy=png.height/2;
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,clear=0,solid=0;
 for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){
  const alpha=png.data[(y*png.width+x)*4+3];if(!alpha)clear++;
  if(alpha<128)continue;solid++;
  const dx=(choice.flip?png.width-x:x)-cx,dy=y-cy,xx=cx+dx*cos-dy*sin,yy=cy+dx*sin+dy*cos;
  left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);
 }
 if(clear<png.width*png.height*.08||solid<png.width*png.height*.1)throw Error('Missing transparent cutout: '+file);
 const scale=choice.visibleWidth/(right-left),visibleLeft=choice.center-choice.visibleWidth/2;
 const placement={left:visibleLeft-left*scale,top:choice.contactY-bottom*scale,width:png.width*scale,height:png.height*scale,rotation:choice.rotation||0,flip:!!choice.flip};
 manifest.push({coat,pose,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),width:png.width,height:png.height,alphaBounds:{left,top,right,bottom},transparentPixels:clear,visible:{left:visibleLeft,right:visibleLeft+choice.visibleWidth,top:choice.contactY-(bottom-top)*scale,bottom:choice.contactY},placement});
}
fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Analyzed 48 transparent night sprites; aligned alpha bounds to the approved room contacts.');
