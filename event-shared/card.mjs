// Presentation only: no fetching, storage, or inference from event text.
const text = value => typeof value === 'string' && value.trim() ? value : '未確認';
const sentiments = {
  positive: ['positive', '好材料'], '好材料': ['positive', '好材料'],
  negative: ['negative', '悪材料'], '悪材料': ['negative', '悪材料'],
  neutral: ['neutral', '中立'], '中立': ['neutral', '中立'],
};

export function eventCardHeader(card, event, {heading, progress, date, formatDate, labels = []}) {
  const node = (tag, value) => {
    const element = document.createElement(tag);
    if (value !== undefined) element.textContent = text(value);
    return element;
  };
  const [sentiment, label] = Object.hasOwn(sentiments, event.sentiment)
    ? sentiments[event.sentiment] : ['unknown', '未確認'];
  card.classList.add('monitor-event');
  card.dataset.sentiment = sentiment;
  const title = node('div');
  title.className = 'monitor-event-heading';
  title.append(heading);
  const fields = node('dl');
  fields.className = 'monitor-event-fields';
  for (const [name, value] of [
    ['進捗状況', progress],
    ['重要度', event.importance],
    ['予定日／実績日', date],
    // Review/collection timestamps do not establish the event's actual update date.
    ['最終更新日', event.updatedAt ? formatDate(event.updatedAt) : '未確認'],
  ]) {
    const row = node('div');
    row.append(node('dt', name), node('dd', text(value)));
    fields.append(row);
  }
  const assessment = node('p', `材料評価：${label}`);
  assessment.className = 'monitor-event-assessment';
  const metadata = node('div');
  metadata.className = 'monitor-event-labels';
  for (const [value, kind = ''] of labels) {
    const badge = node('span', text(value));
    badge.className = 'badge ' + kind;
    metadata.append(badge);
  }
  return [title, fields, assessment, metadata];
}
