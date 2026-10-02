// Local, deliberately small rule set for this frontend prototype.
const NicknameRules = (() => {
 const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null;
 const count = name => segmenter ? [...segmenter.segment(name)].length : [...name].length;
 const inappropriateJapanese = /死ね|しね|殺す|ころす|くたばれ|バカ野郎|ばかやろう|キチガイ|きちがい|基地外|土人|セックス|せっくす|ちんこ|チンコ|ちんぽ|チンポ|まんこ|マンコ|オナニー|おなにー|ペニス|ぺにす|レイプ|れいぷ|おっぱい|オッパイ|児童ポルノ/;
 const inappropriateEnglish = /\b(?:fuck(?:ing|er)?|shit|bitch|cunt|nigg(?:er|a)s?|fagg?ot|chink|retard|sex|porn|penis|vagina|rape)\b/i;
 function validate(value) {
  const name = typeof value === 'string' ? value.trim().normalize('NFC') : '';
  if (!name || count(name) > 12) return { error: '1〜12文字で入力してください。' };
  if (/[\p{Cc}\p{Cf}]/u.test(name.replace(/\u200d/g, '')) || /[<>]/.test(name)) return { error: '使えない記号が含まれています。' };
  // Compatibility normalization catches full-width contact info. Strip separators
  // only for screening; display and save the user's original spelling.
  const normalized = name.normalize('NFKC').toLowerCase();
  const compact = normalized.replace(/[\s\u200d]/gu, '').replace(/[。．｡]/g, '.');
  const contact = /@|(?:https?|hxxps?|ftp):|www\.|[a-z\d](?:[a-z\d-]*\.)+[a-z]{2,63}(?:\b|\/)|(?:\d{1,3}\.){3}\d{1,3}/i;
  const phone = /(?:\+?\d[\s().\-‐‑–—ー]*){7,}/;
  if (contact.test(compact) || phone.test(normalized)) return { error: 'URLや連絡先は使えません。' };
  const screened = compact.replace(/[\p{P}\p{S}]/gu, '');
  if (inappropriateJapanese.test(screened) || inappropriateEnglish.test(normalized) || inappropriateEnglish.test(screened) || /^(?:ばか|バカ|馬鹿|あほ|アホ|くず|クズ|くそ|クソ|チョン|ちょん|エロ|えろ)$/.test(screened)) return { error: '不適切な表現は使えません。' };
  return { name, error: '' };
 }
 return Object.freeze({ validate, count });
})();
