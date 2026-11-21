import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {normalize,hash,changes} from '../scripts/ctis.mjs';
import {update} from '../scripts/update.mjs';
import {publish} from '../scripts/pages-build.mjs';
import {totals} from '../model.mjs';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/source.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(fixture),record=()=>normalize(fixture.detail,fixture.search),at=day=>new Date(`2026-11-${day}T04:17:00Z`);
function fetcher(source=fixture){return async url=>({ok:true,status:200,json:async()=>structuredClone(url.endsWith('/search')?source.search:source.detail)});}
async function area(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'canbas-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
async function saved(dir){return fs.readFile(path.join(dir,'trial.json'),'utf8');}
test('official fixture: eight countries, five approvals, pending recruitment and 29 published sites',()=>{
 const r=record();assert.deepEqual(totals(r),{countries:8,approved:5,underReview:3,recruiting:0,pending:5,sites:29,publishedCountries:5});assert(r.countries.filter(c=>c.approval==='under_review').every(c=>c.sites===null&&c.recruitment==='not_published'));assert.equal(r.ctisUpdatedDate,'2026-11-20');assert.equal(r.ctisPublishedDate,'2026-11-21');
});
test('unchanged retrieval leaves trial JSON untouched; success time advances separately',async t=>{
 const directory=await area(t),first=await update({directory,fetchImpl:fetcher(),now:at('21')});assert.equal(first.dataResult,'initial');const before=await saved(directory);await fs.utimes(path.join(directory,'trial.json'),new Date('2020-01-01'),new Date('2020-01-01'));const second=await update({directory,fetchImpl:fetcher(),now:at('22')});assert.equal(second.dataResult,'unchanged');assert.equal(await saved(directory),before);assert.equal((await fs.stat(path.join(directory,'trial.json'))).mtime.toISOString(),'2020-01-01T00:00:00.000Z');assert.equal(second.status.lastSuccessAt,at('22').toISOString());
});
test('array order and internal IDs do not create information changes',()=>{
 const source=copy();source.detail.authorizedApplication.authorizedPartsII.reverse().forEach(p=>{p.id=100;p.trialSites.reverse();});assert.equal(hash(normalize(source.detail,source.search)),hash(record()));
});
test('new official country approval is highlighted without inventing sites',()=>{
 const source=copy(),app=source.detail.authorizedApplication,info=app.applicationInfo[0].partIIInfo.find(p=>p.mscInfo.countryName==='Belgium').mscInfo;
 Object.assign(info,{trialStatus:'Authorised',decision:'authorized',decisionDate:'2026-11-22'});app.authorizedPartsII.push({mscInfo:{...info,hasRecruitmentStarted:false,trialRecruitmentPeriod:[],activeTrialRecruitmentPeriod:{}},trialSites:[]});source.search.data[0].trialCountries.push('Belgium:2');const next=normalize(source.detail,source.search),diff=changes(record(),next);assert.equal(totals(next).approved,6);assert(diff.some(c=>c.country==='BE'&&c.kind==='approval'&&c.before==='under_review'&&c.after==='approved'));assert.equal(next.countries.find(c=>c.code==='BE').sites.length,0);assert(diff.some(c=>c.kind==='sites'&&c.before===null&&c.after===0));
});
test('official recruitment start/end fields drive country status',()=>{
 const source=copy(),m=source.detail.authorizedApplication.authorizedPartsII[0].mscInfo;m.hasRecruitmentStarted=true;m.trialRecruitmentPeriod=[{recruitmentStartDate:'2026-11-22'}];m.activeTrialRecruitmentPeriod={recruitmentStartDate:'2026-11-22'};const r=normalize(source.detail,source.search);assert.equal(r.countries.find(c=>c.code==='CZ').recruitment,'recruiting');assert(changes(record(),r).some(c=>c.kind==='recruitment'&&c.after==='recruiting'));m.activeTrialRecruitmentPeriod.recruitmentEndDate='2026-11-23';assert.equal(normalize(source.detail,source.search).countries.find(c=>c.code==='CZ').recruitment,'ended');
});
test('same site count with corrected address is still detected as a change',()=>{const source=copy();source.detail.authorizedApplication.authorizedPartsII[0].trialSites[0].organisationAddressInfo.address.oneLine='試験用の修正住所';const diff=changes(record(),normalize(source.detail,source.search));assert(diff.some(c=>c.kind==='sites'&&c.detailsChanged));});
const omissions={
 'country approval decision':s=>delete s.detail.authorizedApplication.authorizedPartsII[0].mscInfo.decision,
 'recruitment boolean':s=>delete s.detail.authorizedApplication.authorizedPartsII[0].mscInfo.hasRecruitmentStarted,
 'recruitment period':s=>delete s.detail.authorizedApplication.authorizedPartsII[0].mscInfo.trialRecruitmentPeriod,
 'site array':s=>delete s.detail.authorizedApplication.authorizedPartsII[0].trialSites,
 'site address':s=>delete s.detail.authorizedApplication.authorizedPartsII[0].trialSites[0].organisationAddressInfo.address,
 'CTIS update date':s=>delete s.search.data[0].lastUpdated,
 'publication date':s=>delete s.search.data[0].lastPublicationUpdate,
 'one of eight countries':s=>s.detail.authorizedApplication.applicationInfo[0].partIIInfo.splice(1,1),
 'inconsistent search countries':s=>s.search.data[0].trialCountries.pop(),
 'inconsistent overall status':s=>s.search.data[0].ctStatus=99,
 'repeated country in application':s=>s.detail.authorizedApplication.applicationInfo[0].partIIInfo.push(structuredClone(s.detail.authorizedApplication.applicationInfo[0].partIIInfo[0])),
 'missing application date':s=>delete s.detail.authorizedApplication.applicationInfo[0].submissionDate,
 'unrecognised decision':s=>s.detail.authorizedApplication.authorizedPartsII[0].mscInfo.decision='new-unknown-value',
 'invalid calendar date':s=>s.search.data[0].lastUpdated='31/02/2026',
 'different trial number':s=>s.detail.ctNumber='2024-511500-16-00'
};
for(const [name,mutate]of Object.entries(omissions))test(`missing/invalid ${name}: keep previous good data and last success`,async t=>{
 const directory=await area(t);await update({directory,fetchImpl:fetcher(),now:at('21')});const previous=await saved(directory),source=copy();mutate(source);const result=await update({directory,fetchImpl:fetcher(source),now:at('22')});assert(!result.ok);assert.equal(result.status.error.code,'source_schema');assert.equal(await saved(directory),previous);assert.equal(result.status.lastSuccessAt,at('21').toISOString());assert.equal(result.status.lastAttemptAt,at('22').toISOString());assert.equal(result.status.result,'failed');
});
for(const [name,fetchImpl]of Object.entries({network:async()=>{throw Error('offline');},http:async()=>({ok:false,status:503}),json:async()=>({ok:true,status:200,json:async()=>{throw Error('invalid JSON');}})}))test(`${name} failure and later recovery: old data retained, failure never becomes success`,async t=>{
 const directory=await area(t);await update({directory,fetchImpl:fetcher(),now:at('21')});const previous=await saved(directory);const failure=await update({directory,fetchImpl,now:at('22')});assert(!failure.ok);assert.equal(failure.status.lastSuccessAt,at('21').toISOString());assert.equal(await saved(directory),previous);const recovered=await update({directory,fetchImpl:fetcher(),now:at('23')});assert(recovered.ok);assert.equal(recovered.dataResult,'unchanged');assert.equal(recovered.status.lastSuccessAt,at('23').toISOString());assert.equal(await saved(directory),previous);
});
test('first retrieval failure does not create a pretend trial snapshot',async t=>{const directory=await area(t);const r=await update({directory,fetchImpl:async()=>{throw Error('offline');},now:at('21')});assert(!r.ok);assert.equal(r.status.lastSuccessAt,null);await assert.rejects(fs.stat(path.join(directory,'trial.json')),{code:'ENOENT'});});
test('Pages setting is verified; build requested explicitly and correct commit completion checked',async()=>{
 const calls=[],commit='a'.repeat(40),responses=[{build_type:'legacy',source:{branch:'main',path:'/'}},{status:'queued'},{status:'built',commit:'b'.repeat(40)},{status:'built',commit}];const out=await publish({repository:'example/repo',token:'test-token',expectedCommit:commit,sleep:async()=>{},fetchImpl:async(url,options)=>{calls.push({url,method:options.method});return{ok:true,json:async()=>responses.shift()};}});assert.equal(out.commit,commit);assert.equal(calls[1].method,'POST');assert.equal(calls.filter(c=>c.method==='POST').length,1);
});
test('changed Pages settings are never silently replaced',async()=>{const calls=[];await assert.rejects(publish({repository:'example/repo',token:'test-token',expectedCommit:'a'.repeat(40),fetchImpl:async(url,options)=>{calls.push(options.method);return{ok:true,json:async()=>({build_type:'workflow',source:{branch:'main',path:'/'}})};}}),/既存公開設定/);assert.deepEqual(calls,['GET']);});
