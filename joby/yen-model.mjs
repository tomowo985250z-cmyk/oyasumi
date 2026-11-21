import {validEntry} from '../monitor-shared/market.mjs';
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const instant=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export const sessionDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
function result(body){if(body?.chart?.error||body?.chart?.result?.length!==1)throw Error('公開株価JSONの必須項目が欠落');return body.chart.result[0];}
export function previousSession(body,at){
  const {meta:m}=result(body);
  if(!m||m.symbol!=='JOBY'||m.currency!=='USD'||m.instrumentType!=='EQUITY'||m.exchangeTimezoneName!=='America/New_York'||!positive(m.regularMarketTime)||!positive(m.previousClose)||!Array.isArray(m.tradingPeriods)||!Number.isInteger(m.priceHint)||m.priceHint<0||m.priceHint>8)throw Error('Jobyの終値・取引時間を確認できません');
  const stockAsOf=new Date(m.regularMarketTime*1000).toISOString(),day=sessionDay(stockAsOf);
  if(!instant(at)||Date.parse(stockAsOf)>Date.parse(at)+300000)throw Error('株価日時が不正');
  const periods=m.tradingPeriods.flat(Infinity);
  if(!periods.length||periods.some(p=>!positive(p?.start)||!positive(p?.end)||p.end<=p.start))throw Error('取引時間の項目欠落');
  const prior=periods.filter(p=>sessionDay(p.end*1000)<day).sort((a,b)=>b.end-a.end)[0];
  if(!prior||!periods.some(p=>sessionDay(p.start*1000)===day))throw Error('前営業日の取引終了時刻を確認できません');
  return {sessionDate:day,previousSessionDate:sessionDay(prior.end*1000),previousCloseAt:new Date(prior.end*1000).toISOString(),previousCloseUSD:Number(m.previousClose.toFixed(m.priceHint)),stockAsOf};
}
export function correspondingFX(body,at){
  const {meta:m,timestamp,indicators}=result(body),open=indicators?.quote?.[0]?.open;
  if(!m||!['JPY=X','USDJPY=X'].includes(m.symbol)||m.currency!=='JPY'||m.instrumentType!=='CURRENCY'||(m.shortName!=='USD/JPY'&&m.longName!=='USD/JPY')||m.dataGranularity!=='1m'||!Number.isInteger(m.priceHint)||m.priceHint<0||m.priceHint>8||!Array.isArray(timestamp)||!Array.isArray(open)||timestamp.length!==open.length)throw Error('対応するUSD/JPYの必須項目が欠落');
  const index=timestamp.indexOf(Date.parse(at)/1000);
  if(index<0||!positive(open[index]))throw Error('終値時刻に一致する為替レートがありません');
  return {usdJpy:Number(open[index].toFixed(m.priceHint)),fxAsOf:at};
}
export function validReference(r){return !!r&&instant(r.stockAsOf)&&instant(r.previousCloseAt)&&instant(r.stockRetrievedAt)&&instant(r.fxRetrievedAt)&&r.fxAsOf===r.previousCloseAt&&positive(r.previousCloseUSD)&&positive(r.usdJpy)&&r.sessionDate===sessionDay(r.stockAsOf)&&r.previousSessionDate===sessionDay(r.previousCloseAt)&&r.previousSessionDate<r.sessionDate;}
export function yenQuote(data,history){
  const stock=validEntry(data?.entries?.joby,'joby')?data.entries.joby:null,fx=validEntry(data?.entries?.usdjpy,'usdjpy')?data.entries.usdjpy:null;
  const quote=stock?.quote,rate=fx?.quote;
  const reference=quote&&history?.version===1&&Array.isArray(history.references)?history.references.find(r=>validReference(r)&&r.sessionDate===sessionDay(quote.asOf)&&Math.abs(r.previousCloseUSD-quote.previousClose)<1e-8):null;
  const price=quote&&rate?quote.price*rate.price:null,previous=reference?reference.previousCloseUSD*reference.usdJpy:null;
  const change=price!==null&&previous!==null?price-previous:null;
  return {stock,fx,quote,rate,reference,price,previous,change,percent:change!==null?change/previous*100:null};
}
