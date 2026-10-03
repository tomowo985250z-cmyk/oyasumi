globalThis.SleepFlow = (() => {
  const rules = { timeZone: 'Asia/Tokyo', morningStartHour: 6, morningEndHour: 12, minimumRestHours: 2 };
  function parts(now) {
    const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: rules.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
    return { day: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour) };
  }
  const day = (now = Date.now()) => parts(now).day;
  const night = (now = Date.now()) => day(now - 12 * 3600000);
  function morningDue(lastSleep, morningDays, now = Date.now()) {
    const current = parts(now);
    if (!lastSleep || lastSleep.nightDate !== night(now) || morningDays.includes(current.day)
      || current.hour < rules.morningStartHour || current.hour >= rules.morningEndHour) return false;
    // 以前の保存データにはatがないため、夜の日付だけで判定します。
    const restAt = lastSleep.finishedAt ?? lastSleep.at;
    if (restAt === undefined) return true;
    const at = Date.parse(restAt);
    return Number.isFinite(at) && now - at >= rules.minimumRestHours * 3600000;
  }
  function openView(lastSleep, morningDays, now = Date.now()) {
    if (morningDue(lastSleep, morningDays, now)) return 'morning';
    if (lastSleep?.finished && lastSleep.nightDate === night(now) && !morningDays.includes(day(now))) return 'rest';
    return 'home';
  }
  return { rules, day, night, morningDue, openView };
})();
