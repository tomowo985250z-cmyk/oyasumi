// Development-only licensed notation import. The browser parses MusicXML; no runtime dependency.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{unzip,midi,musicXML,clock}=require('./notation.cjs');
const root=path.resolve(__dirname,'../..'),sourceDir=path.join(__dirname,'sources/replacements'),round=n=>Math.round(n*1e6)/1e6,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f));
const keep=rows=>rows.filter(r=>!['barcarolle-june','prelude-28-4','moonlight-27-2-1','tristesse-10-3'].includes(r.id));
async function imports(){
 const pw=require(process.env.OYASUMI_PLAYWRIGHT||'C:/Users/智治/oyasumi/output/webkit-tools/core/package'),browser=await pw.chromium.launch({executablePath:process.env.OYASUMI_EDGE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 let chopin;try{const page=await browser.newPage(),zip=unzip(fs.readFileSync(path.join(sourceDir,'chopin-etude-op10-3.mxl'))),file=Object.keys(zip).find(n=>/\.(?:musicxml|xml)$/.test(n)&&!n.startsWith('META-INF'));chopin=await page.evaluate(musicXML,zip[file].toString('utf8'));}finally{await browser.close();}
 assert(chopin.rights.every(r=>r.includes('CC BY 4.0')));assert.equal(chopin.measures.length,78);
 const rows=[],audit=[];
 for(const id of ['moonlight-27-2-1','tristesse-10-3']){
  const moon=id==='moonlight-27-2-1',notes=moon?midi(fs.readFileSync(path.join(sourceDir,'moonlight1.mid'))):chopin.notes;
  const endBeat=Math.max(...notes.map(n=>n.endBeat)),nodes=[{beat:0,spb:60/(moon?48:46)}],sections=[];
  if(!moon)for(const [measure,bpm]of [[20,43],[21,49],[32,48],[45,46],[60,43],[62,46],[75,42],[76,38]]){
   const beat=chopin.measures.find(m=>m.number===measure).beat;nodes.push({beat:Math.max(nodes.at(-1).beat,beat-1),spb:nodes.at(-1).spb},{beat,spb:60/bpm});sections.push({measure,bpm,transitionBeats:1});
  }
  nodes.push({beat:endBeat-2,spb:nodes.at(-1).spb},{beat:endBeat,spb:nodes.at(-1).spb*1.10});const time=clock(nodes);
  const events=notes.map(n=>{
   // The MIDI combines the singing line and rolling triplets on the right-hand track.
   // Sustained/non-triplet notes carry the tune; the regular thirds remain soft inner voice.
   const melody=moon&&n.sourceTrack===1&&(n.endBeat-n.beat>.34||Math.abs(n.beat*3-Math.round(n.beat*3))>.02);
   const sourceTrack=moon?(n.sourceTrack===2?2:melody?1:3):n.sourceTrack;
   return{midi:n.midi,at:round(time(n.beat)),duration:round(time(n.endBeat)-time(n.beat)),velocity:round(moon?.5:n.velocity),sourceMidi:n.midi,sourceTrack,sourceBeat:n.beat,sourceEndBeat:n.endBeat,...(moon?{sourceMidiTrack:n.sourceTrack}:{sourceVoice:n.voice,sourceStaff:n.staff,sourceMeasure:n.measure})};
  }).sort((a,b)=>a.at-b.at||a.midi-b.midi);
  assert(events.every(e=>e.duration>0));if(moon){assert.equal(endBeat,276);assert(events.some(e=>e.sourceTrack===1&&e.midi===68));}
  const files=moon?[['moonlight1.mid','https://www.mutopiaproject.org/ftp/BeethovenLv/O27/moonlight/moonlight-mids.zip'],['moonlight1-a4.ly','https://www.mutopiaproject.org/ftp/BeethovenLv/O27/moonlight/moonlight-lys.zip']]:[['chopin-etude-op10-3.mxl','https://noctavepiano.com/partitions/chopin-etude-op10-3/chopin-etude-op10-3.mxl'],['010-1b-Sm-003.krn','https://raw.githubusercontent.com/pl-wnifc/humdrum-chopin-first-editions/95dfb105c1669c72d10b04088566154f12d3dc1c/kern/010-1b-Sm-003.krn']];
  const source={composer:moon?'Ludwig van Beethoven (1770–1827)':'Frédéric Chopin (1810–1849)',title:moon?'Piano Sonata No.14 in C-sharp minor Op.27 No.2, I. Adagio sostenuto':'Étude in E major Op.10 No.3 (Tristesse)',edition:moon?'Berners, 1908 (A. Winterberger); Mutopia-2007/02/11-276, first movement only':'First Paris edition (M. Schlesinger, 1833), NIFC encoding; Noctave MusicXML conversion, no note changes',credit:moon?'Chris Sawer and Stewart Holmes / Mutopia Project; Copyright © 2007':'First Editions of Fryderyk Chopin’s Music, © 2017-2021 The Fryderyk Chopin Institute (nifc.pl), chopinscores.org; Noctave edition',page:moon?'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=276':'https://noctavepiano.com/en/sheet-music/chopin-etude-op10-3/',license:moon?'Creative Commons Attribution-ShareAlike 2.5':'Creative Commons Attribution 4.0',licenseUrl:moon?'https://creativecommons.org/licenses/by-sa/2.5/':'https://creativecommons.org/licenses/by/4.0/',sources:files.map(([file,url])=>{const bytes=fs.readFileSync(path.join(sourceDir,file));return{file:'sources/replacements/'+file,url,bytes:bytes.length,sha256:hash(bytes)};}),timing:{baseBpm:moon?48:46,sections,clockNodes:nodes,closingBroadening:1.10,notice:'Notation pitch and rhythm only; original restrained tempo map, no external performance.'},...(!moon?{rights:chopin.rights}:{})};
  const title=moon?'月光 第1楽章 Op.27-2':'別れの曲 Op.10-3',seconds=round(time(endBeat)+5),derivedLicense=moon?'CC BY-SA 3.0':'CC BY 4.0';
  rows.push({id,title,source,license:source.license,licenseUrl:source.licenseUrl,sourceSeconds:seconds,sourceEventHash:hash(JSON.stringify(events)),events});
  const softFrom=moon?time(108):time(chopin.measures.find(m=>m.number===21).beat),softTo=moon?time(216):time(chopin.measures.find(m=>m.number===62).beat);
  audit.push({id,source,sourceEventHash:hash(JSON.stringify(events)),sourceNotes:events.length,timeScale:1,phraseSeconds:moon?20:round(8*60/46),softSections:[{from:round(softFrom),to:round(softTo),floor:moon?.92:.78}],softHighNotes:true,profile:'Oyasumi piano: original melody, full-form harmony and characteristic accompaniment; restrained middle section, quiet high register, same sampled piano and -26 LUFS reference',derivedLicense});
  console.log(id,events.length+' source notes',seconds+' seconds',source.license);
 }
 const scores=[...keep(json('test-support/piano/source-scores.json')),...rows],recipes=[...keep(json('test-support/piano/arrangement.json')),...audit],catalog=json('assets/piano-v1/catalog.json');
 if(process.argv.includes('--check')){assert.deepEqual(scores,json('test-support/piano/source-scores.json'));for(const a of audit){const actual=json('test-support/piano/arrangement.json').find(r=>r.id===a.id);for(const [k,v]of Object.entries(a))assert.deepEqual(actual[k],v);}for(const r of rows)assert.equal(catalog.tracks.find(t=>t.id===r.id).loopEnd,r.sourceSeconds);}
 else{for(const row of rows)catalog.tracks.find(t=>t.id===row.id).loopEnd=row.sourceSeconds;for(const [f,v]of [['test-support/piano/source-scores.json',scores],['test-support/piano/arrangement.json',recipes],['assets/piano-v1/catalog.json',catalog]])fs.writeFileSync(path.join(root,f),JSON.stringify(v,null,f.endsWith('source-scores.json')?0:2)+'\n');}
}
imports().catch(e=>{console.error(e.stack);process.exitCode=1;});
