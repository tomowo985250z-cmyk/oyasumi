// One lazy-loaded comparison voice; production music preferences are read only.
(()=>{
 const Audio=globalThis.AudioContext||globalThis.webkitAudioContext,play=document.getElementById('play'),seek=document.getElementById('seek'),volume=document.getElementById('volume'),time=document.getElementById('time'),level=document.getElementById('level'),status=document.getElementById('status'),buttons=[...document.querySelectorAll('[data-variant]')],key='oyasumi-piano-preview-v1';
 let config,context,master,current,selected='piano',playing=false,loading=false,offset=0,started=0,revision=0,locked=false,dragging=false,error='',quietUntil=0,volumeValue=.25;
 const buffers=new Map(),active=new Set(),fade=.18;
 try{const own=JSON.parse(localStorage.getItem(key)||'null'),production=JSON.parse(localStorage.getItem('oyasumi-roof-music-v1')||'null'),saved=own?.volume??production?.volume;if(Number.isFinite(saved))volumeValue=Math.max(0,Math.min(1,saved));}catch{}
 const seconds=()=>config?.seconds||139.00825,position=()=>Math.min(seconds(),Math.max(0,current&&playing?context.currentTime-started:offset)),clock=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
 function ui(){play.disabled=!config||!Audio;play.textContent=playing?'停止':'再生';seek.disabled=locked;for(const b of buttons){b.setAttribute('aria-pressed',String(b.dataset.variant===selected));b.disabled=locked;}volume.value=String(Math.round(volumeValue*100));level.textContent=Math.round(volumeValue*100)+'%';status.textContent=!Audio?'このブラウザーでは試聴できません。音声に対応したSafariまたはChromeで開いてください。':error||(!config?'準備しています。':loading?'音源を読み込んでいます。':playing?(selected==='piano'?'ピアノ版':'オルゴール版')+'を試聴中です。':'再生を押すと試聴できます。');}
 function audio(){if(context)return;context=new Audio();master=context.createGain();master.gain.value=volumeValue;master.connect(context.destination);}
 function ramp(param,target,at,duration){if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(at);else{const value=param.value;param.cancelScheduledValues(at);param.setValueAtTime(value,at);}param.linearRampToValueAtTime(target,at+duration);}
 async function load(id){if(!buffers.has(id))buffers.set(id,(async()=>{const response=await fetch(config.variants[id].url);if(!response.ok)throw Error('音源を読み込めませんでした。もう一度お試しください。');return context.decodeAudioData(await response.arrayBuffer());})().catch(e=>{buffers.delete(id);throw e;}));return buffers.get(id);}
 function retire(entry,duration=.06){if(!entry)return;const at=context.currentTime;ramp(entry.gain.gain,0,at,duration);try{entry.node.stop(at+duration+.005);}catch{}}
 function pause(){revision++;offset=position();playing=false;loading=false;current=null;for(const e of active)retire(e);if(context)quietUntil=context.currentTime+.07;ui();}
 function start(id,buffer,p){
  if(p>=seconds()-.005){offset=seconds();playing=false;ui();return;}
  const track=config.variants[id],old=current,at=Math.max(context.currentTime+.01,quietUntil),node=context.createBufferSource(),gain=context.createGain(),entry={node,gain,id};node.buffer=buffer;gain.gain.value=0;node.connect(gain);gain.connect(master);active.add(entry);current=entry;offset=p;started=at-p;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.8*track.level,at+fade);if(old)retire(old,fade+.01);locked=true;setTimeout(()=>{locked=false;ui();},(at-context.currentTime+fade+.02)*1000);
  node.onended=()=>{active.delete(entry);node.disconnect();gain.disconnect();if(current===entry){current=null;offset=seconds();playing=false;ui();}};
  node.start(at,track.loopStart+p,seconds()-p);ui();
 }
 async function begin(id,p,token){try{audio();await context.resume();if(token!==revision||!playing||document.hidden)return;if(context.state!=='running')throw Error('再生を押して、もう一度お試しください。');const buffer=await load(id);if(token!==revision||!playing||document.hidden)return;loading=false;start(id,buffer,current?position():p);}catch(e){if(token!==revision)return;loading=false;error=e.message;if(!current)playing=false;else selected=current.id;ui();}}
 play.addEventListener('click',()=>{if(playing){pause();return;}error='';playing=true;loading=true;if(offset>=seconds()-.02)offset=0;const token=++revision;audio();void begin(selected,offset,token);ui();});
 for(const b of buttons)b.addEventListener('click',()=>{if(locked||selected===b.dataset.variant)return;selected=b.dataset.variant;error='';if(playing){loading=true;const token=++revision;void begin(selected,position(),token);}ui();});
 seek.addEventListener('input',()=>{dragging=true;time.textContent=clock(+seek.value)+' / '+clock(seconds());});
 seek.addEventListener('change',()=>{const p=Math.max(0,Math.min(seconds(),+seek.value)),wasPlaying=playing;pause();offset=p;dragging=false;if(wasPlaying&&p<seconds()){playing=true;loading=true;const token=++revision;void begin(selected,p,token);}ui();});
 volume.addEventListener('input',()=>{volumeValue=Math.max(0,Math.min(1,+volume.value/100));try{localStorage.setItem(key,JSON.stringify({version:1,volume:volumeValue}));}catch{}if(master)ramp(master.gain,volumeValue,context.currentTime,.08);ui();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',()=>{pause();void context?.suspend().catch(()=>{});});
 const tick=()=>{if(!dragging){seek.value=String(position());time.textContent=clock(position())+' / '+clock(seconds());}requestAnimationFrame(tick);};requestAnimationFrame(tick);
 globalThis.PianoPreview=Object.freeze({inspect:()=>({selected,activeVariant:current?.id||null,playing,loading,position:position(),volume:volumeValue,sourceCount:active.size,state:context?.state||'none',locked,seconds:seconds(),error})});
 fetch('manifest.json').then(r=>{if(!r.ok)throw Error('試聴情報を読み込めませんでした。');return r.json();}).then(data=>{config=data;seek.max=String(data.seconds);ui();}).catch(e=>{error=e.message;ui();});ui();
})();
