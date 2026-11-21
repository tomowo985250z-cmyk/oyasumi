export const TRIAL_ID = '2024-511500-16-01';
export const PORTAL = `https://euclinicaltrials.eu/ctis-public/view/${TRIAL_ID}`;
export const API = 'https://euclinicaltrials.eu/ctis-public-api';
export const COUNTRY_NAMES = Object.freeze({FR:'フランス',DE:'ドイツ',IT:'イタリア',CZ:'チェコ',HU:'ハンガリー',BE:'ベルギー',AT:'オーストリア',ES:'スペイン'});
export const COUNTRY_ORDER = Object.keys(COUNTRY_NAMES);
export const APPROVAL_LABELS = Object.freeze({approved:'承認済み',conditional:'条件付き承認',under_review:'審査中',not_approved:'未承認',withdrawn:'申請取り下げ',expired:'失効'});
export const RECRUITMENT_LABELS = Object.freeze({pending:'募集開始前',recruiting:'患者募集中',ended:'患者募集終了',paused:'患者募集一時停止',not_published:'募集情報は未公開'});
export const TRIAL_LABELS = Object.freeze({authorised:'承認済み',under_review:'審査中',not_authorised:'未承認',withdrawn:'申請取り下げ',ongoing:'実施中',ended:'試験終了',halted:'一時停止',suspended:'中断',revoked:'承認取り消し',expired:'失効'});
export function totals(record) {
  const countries=record.countries;
  return {countries:countries.length,approved:countries.filter(c=>['approved','conditional'].includes(c.approval)).length,underReview:countries.filter(c=>c.approval==='under_review').length,recruiting:countries.filter(c=>c.recruitment==='recruiting').length,pending:countries.filter(c=>c.recruitment==='pending').length,sites:countries.reduce((n,c)=>n+(c.sites?.length||0),0),publishedCountries:countries.filter(c=>c.sites!==null).length};
}
