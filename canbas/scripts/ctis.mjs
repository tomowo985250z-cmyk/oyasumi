import {createHash} from 'node:crypto';
import {API,TRIAL_ID,PORTAL,COUNTRY_ORDER} from '../model.mjs';

export class SourceError extends Error {constructor(code,message){super(message);this.code=code;}}
function need(ok,field){if(!ok)throw new SourceError('source_schema',`公式データの必須項目を確認できません（${field}）。`);}
function object(v,field){need(v&&typeof v==='object'&&!Array.isArray(v),field);return v;}
function list(v,field){need(Array.isArray(v),field);return v;}
function text(v,field){need(typeof v==='string'&&v.trim().length>0,field);return v.trim();}
export function date(v,field){text(v,field);const iso=/^\d{4}-\d{2}-\d{2}$/.test(v)?v:/^\d{2}\/\d{2}\/\d{4}$/.test(v)?v.slice(6)+'-'+v.slice(3,5)+'-'+v.slice(0,2):null;need(iso&&Number.isFinite(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso,field);return iso;}
const COUNTRY_CODES={France:'FR',Germany:'DE',Italy:'IT',Czechia:'CZ','Czech Republic':'CZ',Hungary:'HU',Belgium:'BE',Austria:'AT',Spain:'ES'};
function country(v){const name=text(v,'国名'),code=COUNTRY_CODES[name];need(code,'参加国の対応表');return code;}
const TRIAL_STATES={'Authorised':'authorised','Under evaluation':'under_review','Not authorised':'not_authorised','Withdrawn':'withdrawn','Ongoing':'ongoing','Ended':'ended','Temporarily halted':'halted','Suspended':'suspended','Revoked':'revoked','Expired':'expired'};
function trialState(value){text(value,'治験の状態');need(Object.hasOwn(TRIAL_STATES,value),'治験状態の対応表');return TRIAL_STATES[value];}
function approval(info){
  const state=trialState(info.trialStatus);
  if(state==='under_review')return 'under_review';
  if(state==='withdrawn')return 'withdrawn';
  if(state==='expired')return 'expired';
  if(state==='revoked')return 'revoked';
  const decision=text(info.decision,'国別の承認判断');
  const codes={authorized:'approved',authorized_conditions:'conditional',not_authorized:'not_approved'};
  need(Object.hasOwn(codes,decision),'承認判断の対応表');
  date(info.decisionDate,'国別の承認判断日');
  return codes[decision];
}
function recruitment(info){
  need(typeof info.hasRecruitmentStarted==='boolean','国別の募集開始情報');
  const periods=list(info.trialRecruitmentPeriod,'募集期間'),active=object(info.activeTrialRecruitmentPeriod,'現在の募集期間'),state=trialState(info.trialStatus);
  // A trial halt is not an explicit recruitment halt. Keep that distinction and
  // do not claim that recruitment continues merely because it once started.
  const unconfirmed=['halted','suspended','revoked','expired','ended','withdrawn','not_authorised'].includes(state);
  if(!info.hasRecruitmentStarted){need(periods.length===0&&!active.recruitmentStartDate&&!active.recruitmentEndDate,'募集開始情報と募集期間の整合性');return {state:unconfirmed?'unconfirmed':'pending',start:null,end:null};}
  need(periods.length>0,'募集開始後の募集期間');
  const start=date(active.recruitmentStartDate,'現在の募集開始日'),end=active.recruitmentEndDate?date(active.recruitmentEndDate,'現在の募集終了日'):null;
  need(!end||end>=start,'募集期間の日付順序');
  return {state:end?'ended':unconfirmed?'unconfirmed':'recruiting',start,end};
}
function sites(part,code){
  const rows=list(part.trialSites,'国別の施設一覧'),keys=new Set();
  return rows.map(row=>{const info=object(row.organisationAddressInfo,'施設情報'),organisation=object(info.organisation,'施設名称'),address=object(info.address,'施設の住所');need(country(address.countryName)===code,'施設と国の整合性');
    const site={name:text(organisation.name,'施設名称'),address:text(address.oneLine,'施設の住所'),city:text(address.city,'施設の都市'),postcode:typeof address.postcode==='string'?address.postcode.trim():null};
    const key=JSON.stringify(site);need(!keys.has(key),'施設一覧の重複');keys.add(key);return site;
  }).sort((a,b)=>{const x=JSON.stringify(a),y=JSON.stringify(b);return x<y?-1:x>y?1:0;});
}
export function normalize(detail,search){
  object(detail,'治験詳細');need(detail.ctNumber===TRIAL_ID,'EU CT番号');trialState(detail.ctStatus);need(Number.isInteger(detail.ctPublicStatusCode),'治験公開状態');
  const app=object(detail.authorizedApplication,'公開申請'),partI=object(app.authorizedPartI,'治験基本情報'),identifiers=object(object(partI.trialDetails,'治験情報').clinicalTrialIdentifiers,'治験識別情報');
  need(text(identifiers.publicTitle,'公開タイトル').includes('FUJI-PanC01'),'対象治験の名称');need(text(identifiers.shortTitle,'プロトコル番号')==='CBP 24-01','プロトコル番号の一致');
  const result=list(object(search,'検索結果').data,'検索結果の治験一覧');need(result.length===1&&result[0].ctNumber===TRIAL_ID,'検索結果のEU CT番号');const row=result[0];need(/canbas/i.test(text(row.sponsor,'スポンサー')),'スポンサーの一致');need(row.ctStatus===detail.ctPublicStatusCode,'検索と詳細の治験公開状態の一致');
  const applications=list(app.applicationInfo,'国別申請情報').map(item=>({item,day:date(item.submissionDate,'申請日')})).sort((a,b)=>a.day.localeCompare(b.day));
  const current=new Map();for(const {item} of applications){const seen=new Set();for(const part of list(item.partIIInfo,'申請内の国別情報')){const info=object(part.mscInfo,'国別状態'),code=country(info.countryName);need(!seen.has(code),'申請内の参加国の重複');seen.add(code);current.set(code,info);}}
  need(current.size===COUNTRY_ORDER.length&&COUNTRY_ORDER.every(c=>current.has(c)),'参加国8カ国の情報');
  const parts=new Map();for(const part of list(app.authorizedPartsII,'承認済みの国別詳細')){const code=country(object(part.mscInfo,'承認済みの国別状態').countryName);need(!parts.has(code)&&current.has(code),'国別詳細の重複・整合性');parts.set(code,part);current.set(code,part.mscInfo);}
  const publishedCountries=list(row.trialCountries,'検索結果の公開参加国').map(v=>country(text(v,'検索結果の国名').split(':')[0]));need(new Set(publishedCountries).size===publishedCountries.length&&publishedCountries.length===parts.size&&publishedCountries.every(c=>parts.has(c)),'検索と詳細の公開参加国の一致');
  const countries=COUNTRY_ORDER.map(code=>{const info=current.get(code),state=approval(info),part=parts.get(code),isApproved=['approved','conditional'].includes(state);need(!isApproved||!!part,'承認国の詳細情報');const rec=part?recruitment(info):{state:'not_published',start:null,end:null};
    return {code,approval:state,trialStatus:trialState(info.trialStatus),decisionDate:info.decisionDate?date(info.decisionDate,'国別の判断日'):null,recruitment:rec.state,recruitmentStartDate:rec.start,recruitmentEndDate:rec.end,sites:part?sites(part,code):null};});
  // Only public factual fields are retained. Contacts, investigator names, product
  // internals and unpublished country site counts are deliberately not projected.
  return {trialId:TRIAL_ID,acronym:'FUJI-PanC01',protocol:identifiers.shortTitle,sponsor:row.sponsor,sourceStatus:trialState(detail.ctStatus),ctisUpdatedDate:date(row.lastUpdated,'CTIS情報更新日'),ctisPublishedDate:date(row.lastPublicationUpdate,'CTIS公開日'),countries,sources:{portal:PORTAL,detail:`${API}/retrieve/${TRIAL_ID}`,search:`${API}/search`}};
}
export function hash(record){return createHash('sha256').update(JSON.stringify(record)).digest('hex');}
function siteChanges(before,after,country){
  const key=site=>JSON.stringify(site),old=(before||[]).filter(a=>!(after||[]).some(b=>key(a)===key(b))),fresh=(after||[]).filter(b=>!(before||[]).some(a=>key(a)===key(b))),out=[];
  // Match corrections only when the public name or full address identifies one
  // remaining site on each side. Ambiguous rows remain separate listings.
  for(const identify of [s=>s.name,s=>JSON.stringify([s.address,s.city,s.postcode])])for(const a of [...old]){
    const candidates=fresh.filter(b=>identify(a)===identify(b));
    if(candidates.length!==1||old.filter(b=>identify(a)===identify(b)).length!==1)continue;
    const b=candidates[0];old.splice(old.indexOf(a),1);fresh.splice(fresh.indexOf(b),1);
    for(const [field,kind] of [['name','siteName'],['address','siteAddress'],['city','siteCity'],['postcode','sitePostcode']])if(a[field]!==b[field])out.push({country,kind,site:b.name,siteKey:key(b),before:a[field],after:b[field]});
  }
  for(const a of old)out.push({country,kind:'siteRemoved',site:a.name,siteKey:key(a),before:'listed',after:'not_listed'});
  for(const b of fresh)out.push({country,kind:'siteAdded',site:b.name,siteKey:key(b),before:'not_listed',after:'listed'});
  return out;
}
export function changes(previous,next){
  const out=[];for(const field of ['sourceStatus','ctisUpdatedDate','ctisPublishedDate','sponsor'])if(previous[field]!==next[field])out.push({kind:field,before:previous[field],after:next[field]});
  for(const after of next.countries){const before=previous.countries.find(c=>c.code===after.code);need(before,'前回データの参加国');for(const field of ['approval','trialStatus','decisionDate','recruitment','recruitmentStartDate','recruitmentEndDate'])if(before[field]!==after[field])out.push({country:after.code,kind:field,before:before[field],after:after[field]});
    if((before.sites?.length??null)!==(after.sites?.length??null))out.push({country:after.code,kind:'sites',before:before.sites?.length??null,after:after.sites?.length??null});
    out.push(...siteChanges(before.sites,after.sites,after.code));
  }return out;
}
export async function retrieve(fetchImpl=fetch){
  async function json(url,options={}){let response;try{response=await fetchImpl(url,{...options,headers:{Accept:'application/json',...options.headers},signal:AbortSignal.timeout(25000)});}catch{throw new SourceError('source_network','公式CTISへの接続に失敗しました。');}if(!response.ok)throw new SourceError('source_http',`公式CTISから正常な応答を取得できませんでした（HTTP ${response.status}）。`);try{return await response.json();}catch{throw new SourceError('source_json','公式CTISの応答をJSONとして読み取れません。');}}
  const [detail,search]=await Promise.all([json(`${API}/retrieve/${TRIAL_ID}`),json(`${API}/search`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pagination:{page:1,size:20},sort:{property:'decisionDate',direction:'DESC'},searchCriteria:{number:TRIAL_ID}})})]);
  return normalize(detail,search);
}
