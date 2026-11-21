import {TRIAL_ID,COUNTRY_NAMES,COUNTRY_ORDER,APPROVAL_LABELS,RECRUITMENT_LABELS,TRIAL_LABELS,totals} from './model.mjs?v=2';
const $=id=>document.getElementById(id),el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const when=value=>{const d=new Date(value);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d):'日時を確認できません';};
const day=value=>value?/^\d{4}-\d{2}-\d{2}$/.test(value)?value.replace(/^(\d+)-(\d+)-(\d+)$/,'$1年$2月$3日'):'日付を確認できません':'未掲載';
const timestamp=v=>typeof v==='string'&&Number.isFinite(new Date(v).valueOf()),calendar=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function valid(snapshot){const r=snapshot?.record;if(snapshot?.schemaVersion!==1||!r||r.trialId!==TRIAL_ID||!Array.isArray(r.countries)||r.countries.length!==8||new Set(r.countries.map(c=>c.code)).size!==8||!/^[a-f0-9]{64}$/.test(snapshot.snapshotHash||'')||!timestamp(snapshot.observedAt)||!calendar(r.ctisUpdatedDate)||!calendar(r.ctisPublishedDate)||!Array.isArray(snapshot.comparison?.changes))throw Error('治験情報の形式を確認できません。');for(const c of r.countries)if(!COUNTRY_ORDER.includes(c.code)||!APPROVAL_LABELS[c.approval]||!RECRUITMENT_LABELS[c.recruitment]||!(c.sites===null||Array.isArray(c.sites)))throw Error('国別情報の形式を確認できません。');return r;}
function describe(change){
  const prefix=change.country?`${COUNTRY_NAMES[change.country]}：`:'',labels={approval:'承認状況',recruitment:'患者募集',trialStatus:'治験の状態',sourceStatus:'治験全体の状態',decisionDate:'承認判断日',recruitmentStartDate:'募集開始日',recruitmentEndDate:'募集終了日',ctisUpdatedDate:'CTIS情報更新日',ctisPublishedDate:'CTIS公開日',sites:'公開施設数',sponsor:'スポンサー表記'};
  const value=v=>change.kind==='approval'?APPROVAL_LABELS[v]:change.kind==='recruitment'?RECRUITMENT_LABELS[v]:['trialStatus','sourceStatus'].includes(change.kind)?TRIAL_LABELS[v]:change.kind==='sites'?v===null?'未公開':`${v}施設`:change.kind==='sponsor'?v:day(v);
  if(change.kind==='sites'&&change.detailsChanged)return `${prefix}施設の掲載情報が更新されました（${value(change.after)}）。`;
  return `${prefix}${labels[change.kind]||'公開情報'}が「${value(change.before)}」から「${value(change.after)}」に変わりました。`;
}
function listChanges(target,changes){target.replaceChildren(...changes.map(c=>el('li','',describe(c))));}
function render(snapshot,status){
  const r=valid(snapshot),sum=totals(r),matched=status?.schemaVersion===1&&status.snapshotHash===snapshot.snapshotHash&&timestamp(status.lastAttemptAt)&&timestamp(status.lastSuccessAt)&&['success','failed'].includes(status.result)&&(status.result==='failed'||['initial','changed','unchanged'].includes(status.dataResult)),lastSuccess=matched?status.lastSuccessAt:snapshot.observedAt,success=matched&&status.result==='success',currentChanged=success&&status.dataResult==='changed',diff=snapshot.comparison?.changes||[],notice=$('notice');
  notice.className='notice';notice.replaceChildren();
  if(!matched){notice.classList.add('failure');notice.append(el('span','','取得状態を照合できません。保存済みの正常データを表示しています。'));}
  else if(!success){notice.classList.add('failure');notice.append(el('span','','直近の取得に失敗しました。表示は以前の正常データです。'));notice.append(el('small','',status.error?.message||'情報の変更の有無を確認できません。'));notice.append(el('small','',`取得試行：${when(status.lastAttemptAt)}（日本時間）`));}
  else if(Date.now()-new Date(lastSuccess).valueOf()>36*60*60*1000){notice.classList.add('stale');notice.append(el('span','','最終取得から時間が経っています。現在の状況は公式CTISでもご確認ください。'));}
  else notice.append(el('span','','公式情報を正常に取得しました。'));
  $('approval-summary').textContent=`${sum.approved} / ${sum.countries} カ国`;
  $('approval-summary').setAttribute('aria-label',`${sum.countries}カ国のうち${sum.approved}カ国で承認済み`);
  $('approval-detail').textContent=`${sum.underReview}カ国が審査中${sum.countries-sum.approved-sum.underReview?`、その他${sum.countries-sum.approved-sum.underReview}カ国`:''}。国ごとの判断を表示しています。`;
  $('approval-progress').replaceChildren(...r.countries.map(c=>el('span',['approved','conditional'].includes(c.approval)?'approved':'')));
  const heading=sum.recruiting?`${sum.recruiting}カ国で募集中`:sum.approved>0&&sum.pending===sum.approved?'募集開始前':'国別にご確認ください';
  $('recruitment-summary').textContent=heading;
  $('recruitment-detail').textContent=sum.recruiting?`患者募集の開始が登録された国があります。施設ごとの募集は未確認です。`:sum.pending===sum.approved?`承認済み${sum.approved}カ国で、患者募集開始の登録はありません。`:'国ごとの公開状況を下の一覧に表示しています。';
  $('updated-date').textContent=day(r.ctisUpdatedDate);$('published-date').textContent=day(r.ctisPublishedDate);$('success-date').textContent=when(lastSuccess);
  $('changes-list').hidden=!currentChanged;$('changes-badge').hidden=!currentChanged;document.querySelector('.changes').classList.toggle('changed',currentChanged);
  $('changes-message').textContent=!success?'今回の取得結果から変更の有無を確認できません。':status.dataResult==='initial'?'初回取得です。比較できる前回データはありません。':currentChanged?`${when(snapshot.comparison.previousSuccessAt)}の正常取得と比較しています。`:'前回の正常取得から、公開情報に変更はありません。';
  $('changes-badge').textContent=`${diff.length}件の変更`;listChanges($('changes-list'),currentChanged?diff:[]);
  $('previous-changes').hidden=currentChanged||!diff.length;$('previous-changes-date').textContent=`確認日時：${when(snapshot.observedAt)}（日本時間）`;listChanges($('previous-changes-list'),diff);
  const changedCountries=new Set(currentChanged?diff.map(c=>c.country).filter(Boolean):[]);
  $('country-count').textContent=`${sum.countries}カ国・公開${sum.sites}施設`;
  $('countries').replaceChildren(...r.countries.map(c=>{
    const article=el('article','country'+(changedCountries.has(c.code)?' changed':''));article.dataset.country=c.code;
    const top=el('div','country-top');top.append(el('h3','',COUNTRY_NAMES[c.code]),el('span','pill '+c.approval,APPROVAL_LABELS[c.approval]));article.append(top);
    const metrics=el('div','country-data'),count=el('div'),recruit=el('div');count.append(el('span','metric-label','公開された治験施設'),el('strong','site-count'+(c.sites===null?' unknown':''),c.sites===null?'未公開':`${c.sites.length}施設`));recruit.append(el('span','metric-label','国の患者募集状況'),el('strong','recruitment '+c.recruitment,RECRUITMENT_LABELS[c.recruitment]));metrics.append(count,recruit);article.append(metrics);
    const note=c.sites===null?'施設数は未公開です。「0施設」の意味ではありません。':c.decisionDate?`${['approved','conditional'].includes(c.approval)?'承認判断日':'判断日（CTIS登録）'}：${day(c.decisionDate)}`:'判断日は未掲載です。';article.append(el('p','country-note',note));
    if(!['authorised','under_review'].includes(c.trialStatus))article.append(el('p','country-note',`治験の状態：${TRIAL_LABELS[c.trialStatus]}`));
    if(c.recruitmentStartDate)article.append(el('p','country-note',`募集開始日：${day(c.recruitmentStartDate)}`));if(c.recruitmentEndDate)article.append(el('p','country-note',`募集終了日：${day(c.recruitmentEndDate)}`));
    if(changedCountries.has(c.code))article.append(el('p','country-change','今回、掲載情報に変更がありました。'));
    if(c.sites?.length){const details=el('details'),list=el('ul','sites');details.append(el('summary','',`施設一覧を見る（${c.sites.length}施設・CTIS原文）`));for(const site of c.sites){const li=el('li');li.append(el('span','site-name',site.name),el('span','site-address',[site.address,site.city,site.postcode].filter(Boolean).join(' / ')));list.append(li);}details.append(list);article.append(details);}return article;
  }));$('data').hidden=false;
}
async function load(){const button=$('reload');button.disabled=true;$('monitor').setAttribute('aria-busy','true');try{const [snapshotResponse,statusResponse]=await Promise.all([fetch(new URL('./data/trial.json',import.meta.url),{cache:'no-store'}),fetch(new URL('./data/status.json',import.meta.url),{cache:'no-store'}).catch(()=>null)]);if(!snapshotResponse.ok)throw Error('保存済みの治験情報を読み取れません。');const snapshot=await snapshotResponse.json();let status=null;if(statusResponse?.ok)try{status=await statusResponse.json();}catch{}render(snapshot,status);}catch{$('notice').className='notice failure';$('notice').textContent=`治験情報を正常に読み込めませんでした。${!$('data').hidden?' 表示中の情報は、直前に読み込めたデータです。':''} 最新状況は公式CTISをご確認ください。`;}finally{button.disabled=false;$('monitor').setAttribute('aria-busy','false');}}
$('reload').addEventListener('click',load);
load();
