import {SOURCES,TRIALS,officialUrl} from '../model.mjs';
export const IR_URL='https://ssl4.eir-parts.net/V4Public/eir/4884/ja/announcement/announcement_0.js';
const tdBase='https://www.release.tdnet.info/inbs/';
export class SourceError extends Error{}
function need(value,label){if(!value)throw new SourceError(`公式情報の必須項目・形式を確認できません（${label}）。`);return value;}
export function plain(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n]).replace(/\s+/g,' ').trim();}
function text(v,label){return need(typeof v==='string'&&v.trim(),label).trim();}
function date(v,label,partial=false){need(typeof v==='string',label);let s=v.trim().replace(/令和(\d+)年/g,(_,y)=>`${Number(y)+2018}年`).replace(/平成(\d+)年/g,(_,y)=>`${Number(y)+1988}年`);const m=s.match(/^(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?$/);if(m)s=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;if(partial&&/^\d{4}(-(?:0[1-9]|1[0-2]))?$/.test(s))return s;need(/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s,label);return s;}
function timestamp(v,label){need(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(v),label);date(v.slice(0,10),label);const s=v.replaceAll('/','-').replace(' ','T')+'+09:00';need(Number.isFinite(Date.parse(s)),label);return s;}
export function category(title){return /新株|株式.*発行|資金調達|行使|希薄化|増資|払込/.test(title)?'資金調達':/決算|業績|有価証券報告|株主総会/.test(title)?'決算・IR':/承認|申請|FDA|PMDA|IND|希少疾病/.test(title)?'承認・薬事':/提携|契約|共同研究|導出|ライセンス/.test(title)?'提携・研究':/治験|臨床|症例|患者|試験|トップライン/.test(title)?'治験':'IR';}
function ordered(entries){const out=entries.sort((a,b)=>a.id.localeCompare(b.id));need(new Set(out.map(e=>e.id)).size===out.length,'重複ID');return out;}
export function normalizeIR(body){
 let j;try{j=JSON.parse(body.slice(body.indexOf('{'),body.lastIndexOf('}')+1));}catch{throw new SourceError('公式IR配信データをJSONとして解析できません。');}
 need(Array.isArray(j.item)&&j.item.length>0&&Number(j.item_count)===j.item.length,'IR一覧と件数');
 const entries=[];for(const row of j.item){const id=text(row.guid,'IR識別子'),title=text(row.title,'IRタイトル'),at=timestamp(row.date,'IR日時');if(at.slice(0,10)<'2025-01-01')continue;need(typeof row.news_type==='string','IR種別');const calendar=row.news_type==='calendar',url=row.link?officialUrl(row.link):SOURCES.ir.url;
  // Videos and external transcripts are not copied into the official-source feed.
  if(!url)continue;entries.push({id,title,category:category(title),url,calendar,fields:calendar?{'予定日':at.slice(0,10),'日付区分':'予定'}:{'開示日時':at,'本文確認':'未確認'}});
 }need(entries.length>0,'対象期間のIR情報');return {entries:ordered(entries)};
}
export function tdnetDates(body){const files=[...new Set([...body.matchAll(/I_list_001_(\d{8})\.html/g)].map(m=>m[1]))].sort().reverse();need(files.length>0,'TDnet公開日一覧');return files;}
export function tdnetPages(body,day){const files=[...new Set([...body.matchAll(/I_list_\d{3}_\d{8}\.html/g)].map(m=>m[0]))];need(files.every(f=>f.endsWith(`_${day}.html`)),'TDnetページの日付');return files;}
export function normalizeTDnet(body,day){
 need(/<html/i.test(body)&&(/kjCode/.test(body)||/該当|ありません|開示情報はありませ|開示されていません/.test(plain(body))),'TDnet一覧構造');const entries=[];
 for(const match of body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){const row=match[0];if(!/<td\b[^>]*class=["'][^"']*kjCode[^"']*["'][^>]*>\s*48840\s*<\/td>/i.test(row))continue;
  const link=row.match(/href=["'](\d{18}\.pdf)["']/i),title=plain(row.match(/<td\b[^>]*class=["'][^"']*kjTitle[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)?.[1]||''),time=plain(row.match(/<td\b[^>]*class=["'][^"']*kjTime[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)?.[1]||'');need(link&&title&&/^\d{2}:\d{2}$/.test(time),'対象銘柄の開示行');const at=timestamp(`${day.slice(0,4)}/${day.slice(4,6)}/${day.slice(6)} ${time}:00`,'TDnet開示日時');entries.push({id:link[1].slice(0,-4),title,category:category(title),url:tdBase+link[1],calendar:false,fields:{'開示日時':at,'本文確認':'未確認'}});
 }need([...body.matchAll(/class=["'][^"']*kjCode[^"']*["'][^>]*>\s*48840\s*</gi)].length===entries.length,'TDnet対象銘柄の行数');return entries;
}
export function normalizeJRCT(body,trial){
 const cells=[...body.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>[plain(m[1]),plain(m[2])]);
 const field=(label,required=true)=>{const values=cells.filter(([k])=>k===label||k.startsWith(label+' /')).map(([,v])=>v);need(values.length<=1,`${label}の重複`);if(required)need(values.length===1&&values[0],label);return values[0]||null;};
 need(field('jRCT番号')===trial.jrct&&field('統括管理者の所属機関').includes('クリングルファーマ'),'jRCT治験識別情報');const title=field('研究名称'),phase=field('試験のフェーズ'),recruitment=field('進捗状況'),states={'募集中':'recruiting','募集前':'not_yet_recruiting','募集終了':'not_recruiting','研究終了':'completed','試験終了':'completed','中断':'suspended','中止':'terminated','参加者募集中':'recruiting'};need(phase==='3'&&states[recruitment],'jRCT開発段階・募集状態');const count=field('実施予定被験者数');need(/^\d+$/.test(count),'予定症例数');const optionalDate=label=>{const v=field(label,false);return v?date(v,label):null;};
 return {id:trial.jrct,title:trial.name,category:'治験',pipeline:trial.pipeline,url:`https://jrct.mhlw.go.jp/latest-detail/${trial.jrct}`,recruitmentState:states[recruitment],fields:{'募集状況':recruitment,'開発段階':'第Ⅲ相','予定症例数':Number(count),'実登録人数':null,'登録開始予定日':optionalDate('症例登録開始予定日'),'第1症例登録日':optionalDate('第1症例登録日'),'実施期間開始日':date(field('実施期間（開始日）'),'開始日'),'試験終了予定日':date(field('実施期間（終了日）'),'終了予定日'),'更新日':date(field('最終公表日'),'jRCT最終公表日')}};
}
export function normalizeCTgov(json){
 need(Array.isArray(json.studies)&&json.studies.length===TRIALS.length,'対象2試験のJSON');const entries=[];
 for(const study of json.studies){const p=study.protocolSection,trial=TRIALS.find(t=>t.nct===p?.identificationModule?.nctId);need(trial&&p.sponsorCollaboratorsModule?.leadSponsor?.name==='Kringle Pharma, Inc.'&&p.identificationModule.briefTitle.includes(trial.pipeline==='sci-jp'?'KP-100IT':'KP-100LI'),'ClinicalTrials.gov治験識別情報');const s=p.statusModule,d=p.designModule,labels={RECRUITING:['募集中','recruiting'],NOT_YET_RECRUITING:['募集開始前','not_yet_recruiting'],ACTIVE_NOT_RECRUITING:['実施中・募集なし','not_recruiting'],COMPLETED:['試験終了','completed'],SUSPENDED:['一時中断','suspended'],TERMINATED:['中止','terminated'],WITHDRAWN:['開始前中止','withdrawn'],UNKNOWN:['状態未確認','unknown']};need(labels[s?.overallStatus]&&d?.phases?.includes('PHASE3')&&Number.isInteger(d.enrollmentInfo?.count)&&['ACTUAL','ESTIMATED'].includes(d.enrollmentInfo.type),'ClinicalTrials.gov募集・段階・人数');
  const fields={'募集状況':labels[s.overallStatus][0],'開発段階':'第Ⅲ相','登録人数':d.enrollmentInfo.count,'人数区分':d.enrollmentInfo.type==='ACTUAL'?'実績':'予定','更新日':date(s.lastUpdatePostDateStruct?.date,'公開更新日')};
  for(const [name,key] of [['開始日','startDateStruct'],['主要評価完了日','primaryCompletionDateStruct'],['試験完了日','completionDateStruct']]){const v=s[key];need(v?.date,'ClinicalTrials.gov '+name);need(!v.type||['ACTUAL','ESTIMATED'].includes(v.type),'日付区分');fields[name]=date(v.date,name,true);fields[name+'区分']=v.type==='ACTUAL'?'確定':v.type==='ESTIMATED'?'予定':'未確認';}
  entries.push({id:trial.nct,title:trial.name,category:'治験',pipeline:trial.pipeline,url:`https://clinicaltrials.gov/study/${trial.nct}`,recruitmentState:labels[s.overallStatus][1],fields});
 }return {entries:ordered(entries)};
}
export async function retrieve(source,{fetchImpl=fetch,previous=null,lastSuccessAt=null}={}){
 async function get(url){let r;try{r=await fetchImpl(url,{headers:{Accept:'application/json,text/html,text/javascript;q=0.9','User-Agent':'KringlePublicMonitor/1.0'},signal:AbortSignal.timeout(25000)});}catch{throw new SourceError('公式情報源への接続に失敗しました。');}if(!r.ok)throw new SourceError(`公式情報源がHTTP ${r.status}を返しました。`);return r;}
 if(source==='ir')return {record:normalizeIR(await(await get(IR_URL)).text()),coverage:'2025年以降の公式IR公開一覧'};
 if(source==='jrct')return {record:{entries:ordered(await Promise.all(TRIALS.map(async t=>normalizeJRCT(await(await get(`https://jrct.mhlw.go.jp/latest-detail/${t.jrct}`)).text(),t))))},coverage:'対象2試験の公開詳細'};
 if(source==='ctgov'){const url=`https://clinicaltrials.gov/api/v2/studies?filter.ids=${TRIALS.map(t=>t.nct).join(',')}&format=json`;return {record:normalizeCTgov(await(await get(url)).json()),coverage:'対象2試験の公開JSON'};}
 need(source==='tdnet','情報源');const index=await(await get(SOURCES.tdnet.url)).text(),available=tdnetDates(index),today=available[0],since=lastSuccessAt?new Date(Date.parse(lastSuccessAt)-86400000).toISOString().slice(0,10).replaceAll('-',''):available[Math.min(6,available.length-1)],days=available.filter(d=>d>=since),found=[];
 need(days.length>0,'TDnet対象期間');for(const day of days){const first=`I_list_001_${day}.html`,body=await(await get(tdBase+first)).text();found.push(...normalizeTDnet(body,day));for(const file of tdnetPages(body,day).filter(f=>f!==first))found.push(...normalizeTDnet(await(await get(tdBase+file)).text(),day));}
 const merged=new Map((previous?.entries||[]).map(e=>[e.id,e]));for(const item of found)merged.set(item.id,item);return {record:{entries:ordered([...merged.values()])},coverage:`${days.at(-1)}〜${today}（全ページ確認・過去取得分を保持）${lastSuccessAt&&since<available.at(-1)?'。31日を超える未取得期間あり':''}`};
}
