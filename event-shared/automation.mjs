import {createHash} from 'node:crypto';
import {extractPdf} from './pdf.mjs';

const digest=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const fail=message=>{throw Error(message);};
const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const compact=s=>s.normalize('NFKC').replace(/\s+/g,'');
const meaning=f=>digest(f.kind==='event'?{...f.value,detail:undefined}:f.value);
export const TARGETS={
 canbas:[{id:'cbp501-eu',name:'CBP501・欧州第Ⅲ相',ids:['FUJI-PanC01','2024-511500-16-01'],drug:'CBP501',phase:'第Ⅲ相'}],
 kringle:[{id:'sci-jp',name:'脊髄損傷・国内追加試験',ids:['jRCT2031260281','NCT07722962'],drug:'KP-100IT',phase:'第Ⅲ相'},{id:'vfs-jp',name:'声帯瘢痕・国内試験',ids:['jRCT2051220132','NCT05627648'],drug:'KP-100LI',phase:'第Ⅲ相'}],joby:[]
};
export function documentUrl(company,value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  const h=u.hostname,p=u.pathname,code=company==='canbas'?'4575':'4884';
  if(company==='joby')return ((['ir.jobyaviation.com','www.jobyaviation.com','jobyaviation.com','www.faa.gov'].includes(h))||(h==='d1io3yog0oux5.cloudfront.net'&&p.includes('/jobyaviation/'))||(h==='www.sec.gov'&&p.startsWith('/Archives/edgar/data/1819848/')))?u.href:null;
  return ((h==='ssl4.eir-parts.net'&&p.startsWith('/doc/'+code+'/'))||(h==='www.release.tdnet.info'&&/^\/inbs\/\d{18}\.pdf$/.test(p))||(h==='www2.jpx.co.jp'&&p.startsWith('/disc/'+code+'0/'))||(company==='canbas'?['www.canbas.co.jp','canbas.co.jp']:['www.kringle-pharma.com','kringle-pharma.com']).includes(h))?u.href:null;
 }catch{return null;}
}
async function download(company,url,prior,fetchImpl){
 for(let redirects=0;redirects<4;redirects++){
  if(!documentUrl(company,url))fail('公式発行者・リンクを照合できません。');
  const headers={'User-Agent':'OfficialEventMonitor/2.0','Accept':'application/pdf'};
  if(prior?.etag)headers['If-None-Match']=prior.etag;if(prior?.lastModified)headers['If-Modified-Since']=prior.lastModified;
  const r=await fetchImpl(url,{headers,redirect:'manual',signal:AbortSignal.timeout(25000)});
  if([301,302,303,307,308].includes(r.status)){url=new URL(r.headers.get('location'),url).href;continue;}
  if(r.status===304){if(!prior?.hash)fail('初回取得で304応答を受信しました。');return null;}
  if(!r.ok)fail('PDF取得失敗：HTTP '+r.status);
  if(Number(r.headers.get('content-length'))>8*1024*1024)fail('PDFが取得上限8MBを超えています。');
  const parts=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>8*1024*1024)fail('PDFが取得上限8MBを超えています。');parts.push(chunk);}const bytes=Buffer.concat(parts);
  if(!bytes.subarray(0,8).toString().startsWith('%PDF-'))fail('PDF形式ではありません。');
  return {bytes,hash:digest(bytes),etag:r.headers.get('etag'),lastModified:r.headers.get('last-modified'),resolvedUrl:url};
 }fail('公式PDFのリダイレクトが多すぎます。');
}
function evidence(doc,original,asOf,page,at){
 if(!validDay(asOf)||!validDay(doc.publishedAt)||asOf>doc.publishedAt||doc.publishedAt>at.slice(0,10))fail('基準日・公表日の前後関係を確認できません。');
 return {url:doc.url,resolvedUrl:doc.resolvedUrl||doc.url,title:doc.title,documentHash:doc.hash,page:String(page),original,asOf,publishedAt:doc.publishedAt,confirmedAt:at,method:'automatic'};
}
function explicitDate(text){const dates=[...text.matchAll(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);const unique=[...new Set(dates)];return unique.length===1&&validDay(unique[0])?unique[0]:null;}
// Planned/conditional/negated statements never become completed milestones.
export function clinicalFacts(company,pages,doc,at){
 const facts=[];
 for(const [index,page]of pages.entries())for(const block of page.blocks){
  const text=compact(block);if(text.length>900)continue;
  const target=(TARGETS[company]||[]).filter(t=>t.ids.some(id=>text.toLowerCase().includes(id.toLowerCase()))&&text.includes(t.drug));if(target.length!==1)continue;
  if(/予定|計画|目指|見込|準備|方針|場合|可能性|未実施|していません|しておりません|撤回|取り下げ|訂正|中止|延期|開始承認/.test(text))continue;
  const day=explicitDate(block);if(!day)continue;const t=target[0];
  const stage=/第(?:3|III|Ⅲ)相/.test(text)?'第Ⅲ相':/第(?:2|II|Ⅱ)相/.test(text)?'第Ⅱ相':/第(?:1|I|Ⅰ)相/.test(text)?'第Ⅰ相':null;
  let kind,phase=stage,state='in_progress',category='治験',progress='in_progress',label;
  if(/製造販売承認を(?:取得|受領)(?:しました|いたしました|した|しています)/.test(text)){kind='marketing-approval';phase='承認';state='completed';category='承認・薬事';progress='completed';label='製造販売承認取得';}
  else if(/製造販売承認申請を(?:行いました|実施しました|提出しました)/.test(text)){kind='marketing-application';phase='承認申請';category='承認・薬事';progress='completed';label='製造販売承認申請の提出';}
  else if(stage===t.phase&&/(?:試験|患者登録|症例登録|症例組入れ)を(?:開始しました|開始いたしました|開始した)/.test(text)){kind='trial-start';label=stage+'試験・登録開始';}
  else if(stage===t.phase&&/(?:試験|経過観察)を(?:終了しました|完了しました)/.test(text)){kind='trial-end';state='analysis';progress='completed';label=stage+'試験終了（承認ではありません）';}
  if(kind?.startsWith('marketing-')){const region=company==='canbas'?/欧州|European|EMA/:/日本|国内|厚生労働省|PMDA/,other=company==='canbas'?/日本|国内|米国|FDA|PMDA/:/欧州|米国|FDA|EMA/;if(!region.test(text)||other.test(text))continue;}
  if(!kind)continue;const proof=evidence(doc,block,day,index+1,at);
  facts.push({key:'pipeline:'+t.id,kind:'pipeline',target:t.id,value:{stage:phase,state},evidence:proof});
  const id='auto-'+t.id+'-'+kind+'-'+day;
  facts.push({key:'event:'+id,kind:'event',target:id,value:{id,title:t.name+'・'+label+'（会社発表）',pipeline:t.id,category,date:day,certainty:'confirmed',progress,detail:'会社発表に明記された内容を自動照合。'+block},evidence:proof});
 }
 return facts;
}
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
function englishDate(s){const m=s.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);return m?`${m[3]}-${String(months.findIndex(v=>v.slice(0,3)===m[1].slice(0,3).toLowerCase())+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:null;}
export function certificationFacts(pages,doc,at){
 const found=[];
 for(const [index,p]of pages.entries()){
  if(!/Joby/i.test(p.text)||!/Certification Basis/i.test(p.text)||!/Means of Compliance/i.test(p.text)||!/Certification Plans/i.test(p.text)||!/Testing\s*(?:&|and)\s*Analysis/i.test(p.text)||!/Show\s*(?:&|and)\s*Verify/i.test(p.text))continue;
  const dateMatches=[...p.text.matchAll(/(?:DATA\s+AS\s+OF|Data\s+as\s+of)\s+([A-Za-z]+\s+\d{1,2},?\s+20\d{2})/g)].map(m=>englishDate(m[1]));const dates=[...new Set(dateMatches)];
  if(dates.length!==1||!validDay(dates[0]))fail('認証表の一意な基準日を抽出できません。');
  const words=p.words,anchors=[];
  for(const w of words){const joined=w.text.match(/^STAGE\s*([1-5])$/i);if(joined)anchors.push({...w,stage:+joined[1]});else if(/^STAGE$/i.test(w.text)){const next=words.filter(n=>/^[1-5]$/.test(n.text)&&Math.abs(n.y-w.y)<3&&n.x>=w.right&&n.x-w.right<25);if(next.length===1)anchors.push({...w,stage:+next[0].text});}}
  anchors.sort((a,b)=>a.stage-b.stage);if(anchors.length!==5||anchors.some((a,i)=>a.stage!==i+1||(i&&a.y<=anchors[i-1].y)))fail('認証5段階の位置・順序が一致しません。');
  const inLegend=w=>w.y>=anchors[0].y&&w.y<anchors[1].y&&w.x>anchors[0].right;
  const joby=words.filter(w=>/^JOBY$/i.test(w.text)&&inLegend(w)),faa=words.filter(w=>/^FAA$/i.test(w.text)&&inLegend(w));
  if(joby.length!==1||faa.length!==1||faa[0].y<=joby[0].y||Math.abs(joby[0].x-faa[0].x)>3)fail('Joby／FAAの凡例・系列順を確定できません。');
  const percentages=words.filter(w=>/^\d{1,3}(?:\.\d+)?%$/.test(w.text)&&w.y>=joby[0].y-2&&w.x>joby[0].right);
  if(percentages.length!==10)fail('認証表の数値が10個揃いません。');
  const stages=anchors.map((a,i)=>{const top=i?(anchors[i-1].y+a.y)/2:a.y-(anchors[1].y-a.y)/2,bottom=i<4?(a.y+anchors[i+1].y)/2:a.y+(a.y-anchors[i-1].y)/2;const values=percentages.filter(w=>w.y>=top&&w.y<bottom).sort((x,y)=>x.y-y.y);if(values.length!==2||values[1].y-values[0].y<3||Math.abs(a.x-anchors[0].x)>3||Math.abs(values[0].y-a.y-(joby[0].y-anchors[0].y))>3||Math.abs(values[1].y-a.y-(faa[0].y-anchors[0].y))>3)fail('段階とJoby／FAAの2数値を対応付けできません。');return{stage:i+1,joby:Number(values[0].text.slice(0,-1)),faa:Number(values[1].text.slice(0,-1))};});
  if(stages.some(s=>s.joby>100||s.faa>100))fail('認証進捗率が0〜100％の範囲外です。');
  const period=doc.title.match(/Q[1-4]\s+20\d{2}/)?.[0];if(!period)fail('株主資料の対象四半期を確定できません。');
  const footerDates=[...p.text.matchAll(new RegExp(period+'\\s+Shareholder\\s+Letter\\s+([A-Za-z]+\\s+\\d{1,2},?\\s+20\\d{2})','gi'))].map(m=>englishDate(m[1])),published=[...new Set(footerDates)];
  if(published.length!==1||!validDay(published[0])||(doc.publishedAt&&doc.publishedAt!==published[0]))fail('資料の公表日を本文・公開一覧と照合できません。');
  const quote=words.filter(w=>w.y>=anchors[0].y-40&&w.y<=anchors[4].y+(anchors[4].y-anchors[3].y)/2).map(w=>w.text).join(' ');
  const proof=evidence({...doc,publishedAt:published[0]},quote,dates[0],index+1,at);found.push({key:'certification:'+proof.asOf,kind:'certification',target:proof.asOf,value:{asOf:proof.asOf,publishedAt:proof.publishedAt,period,stages},evidence:proof});
 }
 if(found.length>1)fail('認証表が複数あり自動確定できません。');return found;
}
function sourceRef(f){return {title:f.evidence.title,url:f.evidence.url,page:f.evidence.page,publishedAt:f.evidence.publishedAt,method:'automatic'};}
function jobyEvents(pages,doc,at){
 const facts=[];
 for(const [i,p]of pages.entries())for(const text of p.blocks){
  if(text.length>800||!/Joby Aviation/i.test(text)||!/\bTIA\b|Type Inspection Authorization/i.test(text)||/\bwill\b|\bplan\w*\b|\bexpect\w*\b|\bintend\w*\b|\bmay\b|\bnot\b|subject to|correction|amendment/i.test(text))continue;
  if(!/Joby Aviation(?:,? Inc\.?)?\s+(?:has\s+)?(?:begun|started|commenced)\s+(?:its\s+)?(?:TIA|Type Inspection Authorization)\s+(?:flight\s+)?testing/i.test(text))continue;
  const dates=[...text.matchAll(/\b[A-Za-z]+\s+\d{1,2},?\s+20\d{2}\b/g)].map(m=>englishDate(m[0])).filter(Boolean);if(new Set(dates).size!==1)continue;
  const day=dates[0],proof=evidence(doc,text,day,i+1,at),id='auto-joby-tia-'+day;
  facts.push({key:'event:'+id,kind:'event',target:id,value:{id,title:'Joby・TIA試験開始（会社発表）',category:'TIA',date:day,certainty:'confirmed',progress:'in_progress',basis:'company',detail:'会社資料にTIA試験開始の明記を確認。FAA独立確認とは区別します。'},evidence:proof});
 }return facts;
}
export function applyFacts(base,facts){
 const reviewed=structuredClone(base);
 for(const f of Object.values(facts).sort((a,b)=>a.evidence.asOf.localeCompare(b.evidence.asOf))){
  const date=f.evidence.confirmedAt.slice(0,10);
  if(f.kind==='pipeline'){const p=reviewed.pipelines?.find(p=>p.id===f.target);if(p&&f.evidence.asOf>=p.reviewedAt){Object.assign(p,f.value,{note:f.evidence.url.includes('/ctis-public/')?(f.value.state==='in_progress'?'CTIS国別情報で一部参加国の実施・募集開始を確認。全施設の開始を意味しません。':'CTIS国別情報で全参加国の試験終了を確認。薬事承認ではありません。'):'公式資料の明記された状態を自動照合。根拠は「自動照合・確認待ち」に表示。',reviewedAt:date,source:sourceRef(f)});}}
  if(f.kind==='event'&&!reviewed.events.some(e=>e.id===f.target))reviewed.events.push({...f.value,reviewedAt:date,source:sourceRef(f)});
  if(f.kind==='certification'){const existing=reviewed.certifications.find(c=>c.asOf===f.value.asOf);if(!existing)reviewed.certifications.push({...f.value,reviewedAt:date,source:sourceRef(f)});}
  if(!reviewed.documents.some(d=>d.url===f.evidence.url))reviewed.documents.push({...sourceRef(f),reviewedAt:date});
 }
 if(reviewed.certifications)reviewed.certifications.sort((a,b)=>a.asOf.localeCompare(b.asOf));return reviewed;
}
function registryFacts(company,sources,status,at){
 const facts=[],pending=[];
 if(company==='canbas'&&status.ctis?.result==='success'){
  const entries=sources.ctis?.record.entries||[],raw=entries.map(e=>e.original);
  if(raw.length===8&&new Set(raw.map(r=>r?.country)).size===8&&entries.every(e=>e.url==='https://euclinicaltrials.eu/ctis-public/view/2024-511500-16-01'&&e.id===e.original?.country)&&raw.every(r=>r?.trialId==='2024-511500-16-01'&&validDay(r.updatedAt)&&r.updatedAt<=at.slice(0,10))){
   const running=raw.filter(r=>r.trialStatus==='ongoing'||r.recruitment==='recruiting'),ended=raw.every(r=>r.trialStatus==='ended');
   if(running.some(r=>!['approved','conditional'].includes(r.approval)))pending.push({url:entries[0].url,title:'FUJI-PanC01',result:'pending',reason:'実施・募集と国別承認状況に不整合があります。'});
   else if(running.length||ended){const asOf=raw.map(r=>r.updatedAt).sort().at(-1);facts.push({key:'pipeline:cbp501-eu',kind:'pipeline',target:'cbp501-eu',value:{stage:'第Ⅲ相',state:ended?'analysis':'in_progress'},evidence:{url:entries[0].url,title:'CTIS・FUJI-PanC01（国別登録情報）',page:'国別治験情報',original:JSON.stringify(raw),asOf,publishedAt:asOf,confirmedAt:at,method:'automatic'}});}
  }
 }
 for(const t of TARGETS[company]||[]){
  const entries=sources.ctgov?.record.entries||[],e=entries.find(e=>t.ids.includes(e.id));if(!e||status.ctgov?.result!=='success'||!e.original)continue;
  const raw=e.original,phases={PHASE1:'第Ⅰ相',PHASE2:'第Ⅱ相',PHASE3:'第Ⅲ相'},phase=raw.phases?.length===1?phases[raw.phases[0]]:null;
  const paired=sources.jrct?.record.entries.find(j=>t.ids.includes(j.id));
  if(paired&&(status.jrct?.result!=='success'||paired.recruitmentState!==e.recruitmentState||paired.fields?.['開発段階']!==phase)){pending.push({url:e.url,title:t.name,result:'pending',reason:'登録簿間の募集状態・段階が不一致、または対になる登録簿の最新取得を確認できません。'});continue;}
  const state=raw.status==='NOT_YET_RECRUITING'?'planned':['RECRUITING','ACTIVE_NOT_RECRUITING'].includes(raw.status)?'in_progress':raw.status==='COMPLETED'&&raw.completion?.type==='ACTUAL'?'analysis':null;
  if(!phase||!state||!validDay(raw.updatedAt)||raw.updatedAt>at.slice(0,10)||raw.id!==e.id||e.url!=='https://clinicaltrials.gov/study/'+e.id||raw.sponsor!=='Kringle Pharma, Inc.'||!raw.title?.includes(t.drug)){pending.push({url:e.url,title:t.name,result:'pending',reason:'治験ID・段階・実績区分・スポンサーの完全な一致を確認できません。'});continue;}
  facts.push({key:'pipeline:'+t.id,kind:'pipeline',target:t.id,value:{stage:phase,state},evidence:{url:e.url,title:'ClinicalTrials.gov・'+t.name,page:'protocolSection',original:JSON.stringify(raw),asOf:raw.updatedAt,publishedAt:raw.updatedAt,confirmedAt:at,method:'automatic'}});
 }
 return {facts,pending};
}
function candidates(company,sources,base){
 const map=new Map(),cutoff=[...base.events,...base.documents].map(e=>e.reviewedAt||'').sort().at(-1)||'2025-01-01';
 for(const [source,s]of Object.entries(sources))if(['ir','tdnet','shareholders'].includes(source))for(const e of s.record.entries){
  const date=(e.fields['公表日時']||e.fields['開示日時']||e.fields['公表日']||'').slice(0,10),period=e.fields['対象期'];
  if(!/\.pdf(?:\?|$)/i.test(e.url)||!documentUrl(company,e.url)||e.calendar)continue;
  if(date&&date<cutoff&&source!=='shareholders')continue;
  if(!/(?:治験|臨床|試験|承認|決算|資金|新株|提携|契約|clinical|trial|certif|shareholder|Q[1-4] 20\d{2})/i.test(e.title)&&source!=='shareholders')continue;
  const rank=s=>{const m=s?.match(/^Q([1-4]) (20\d{2})$/);return m?+m[2]*4 + +m[1]:0;};
  if(source==='shareholders'&&rank(period)<rank(base.certifications?.at(-1)?.period))continue;
  const known=base.certifications?.find(c=>c.period===period);const publishedAt=date||known?.publishedAt||null;
  map.set(e.url,{url:e.url,title:e.title,publishedAt,source,period});
 }
 return [...map.values()].sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||'')||a.url.localeCompare(b.url)).slice(0,18);
}
export async function automate({company,base,prior,sources,status,now,fetchImpl=fetch,extract=extractPdf,maxDownloads=6,priorChecks={}}){
 const at=now.toISOString(),automation=structuredClone(prior||{version:1,documents:{},facts:{},registryPending:[]});
 const checks={...priorChecks};
 const proposals=[],live=candidates(company,sources,base).filter(d=>status[d.source]?.result==='success'||status[d.source]?.result==='fallback');
 live.sort((a,b)=>Number(!!automation.documents[a.url])-Number(!!automation.documents[b.url])||(checks[a.url]||'').localeCompare(checks[b.url]||''));
 for(const doc of live.slice(0,maxDownloads)){
  const saved=automation.documents[doc.url];
  checks[doc.url]=at;
  try{
   const result=await download(company,doc.url,saved,fetchImpl);
   if(!result||result.hash===saved?.hash){if(saved?.fetchError){delete saved.fetchError;}continue;}
   const record={...doc,...result,observedAt:at};delete record.bytes;
   let facts=[];
   try{const pages=await extract(result.bytes);const issuer=pages.slice(0,3).map(p=>compact(p.text)).join('');if(!new RegExp(company==='joby'?'JobyAviation':company==='canbas'?'4575|株式会社キャンバス':'4884|クリングルファーマ','i').test(issuer))fail('PDF本文の発行者が対象企業と一致しません。');facts=company==='joby'?[...certificationFacts(pages,record,at),...jobyEvents(pages,record,at)]:clinicalFacts(company,pages,record,at);if(!facts.length)fail('ID・実施済み表現・基準日、または認証表の対応を厳密に確定できません。');record.result='verified';record.reason='本文・対象・日付を自動照合';proposals.push(...facts);}
   catch(e){record.result='pending';record.reason=e.message;}
   automation.documents[doc.url]=record;
  }catch(e){automation.documents[doc.url]={...(saved||doc),result:saved?.result||'pending',reason:saved?.reason||'取得できないため確認待ち',fetchError:e.message};}
 }
 const registry=registryFacts(company,sources,status,at);automation.registryPending=registry.pending;proposals.push(...registry.facts);
 const byKey=new Map();for(const f of proposals){if(!byKey.has(f.key))byKey.set(f.key,[]);byKey.get(f.key).push(f);}
 const blockedDocuments=new Set(),accepted=[];
 for(const [key,list]of byKey){
  if(list.some(f=>blockedDocuments.has(f.evidence.url)))continue;
  const latest=list.map(f=>f.evidence.asOf).sort().at(-1),current=list.filter(f=>f.evidence.asOf===latest),f=current[0],before=automation.facts[key];
  const original=f.kind==='certification'?base.certifications?.find(c=>c.asOf===f.target):null;
  if(f.kind==='certification'&&!original&&f.target<=base.certifications.at(-1).asOf)continue;
  let reason=new Set(current.map(meaning)).size>1?'同じ基準日の公式記載が矛盾しています。':null;
  if(before&&before.evidence.asOf>latest)continue;
  if(before&&before.evidence.asOf===latest&&meaning(before)!==meaning(f))reason='同一基準日の訂正・矛盾を検出。以前の値を保持します。';
  if(original&&digest(original.stages)!==digest(f.value.stages))reason='確認済み認証値との不一致。同一基準日の訂正版は確認待ちです。';
  const p=base.pipelines?.find(p=>p.id===f.target),oldValue=before?.value||p;
  const stages=['非臨床','第Ⅰ相','第Ⅱ相','第Ⅲ相','承認申請','承認'];
  if(f.kind==='pipeline'&&oldValue&&(stages.indexOf(f.value.stage)<stages.indexOf(oldValue.stage)||(oldValue.state!=='planned'&&f.value.state==='planned')))reason='既存の開発段階・実施状況への後退を検出。確認待ちです。';
  if(reason){for(const item of current)blockedDocuments.add(item.evidence.url);automation.registryPending.push({url:f.evidence.url,title:f.evidence.title,result:'pending',reason,original:f.evidence.original,asOf:latest});for(const item of current)if(automation.documents[item.evidence.url]){automation.documents[item.evidence.url].result='pending';automation.documents[item.evidence.url].reason=reason;}continue;}
  if(!before||before.evidence.asOf!==latest||meaning(before)!==meaning(f))accepted.push([key,f]);
 }
 for(const [key,f]of accepted)if(!blockedDocuments.has(f.evidence.url))automation.facts[key]=f;
 return {automation,reviewed:applyFacts(base,automation.facts),checks};
}
export async function integrateAutomation(data,status,base,{enabled,validate,...options}){
 if(!enabled)return {reviewed:base,changed:false};
 const before=digest(data.automation||null);
 try{const result=await automate({...options,base,prior:data.automation,sources:data.sources,status:status.sources});validate(result.reviewed);data.automation=result.automation;status.automation={result:'success',lastAttemptAt:options.now.toISOString(),checks:result.checks,error:null};return {reviewed:result.reviewed,changed:before!==digest(data.automation)};}
 catch(e){status.automation={result:'failed',lastAttemptAt:options.now.toISOString(),checks:options.priorChecks||{},error:e.message};return {reviewed:structuredClone(data.reviewed||base),changed:false};}
}
