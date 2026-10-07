globalThis.SleepFlow = (() => {
  const rules = { timeZone: 'Asia/Tokyo', morningStartHour: 6, morningEndHour: 12 };
  function parts(now) {
    const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: rules.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
    return { day: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour) };
  }
  const day = (now = Date.now()) => parts(now).day;
  const night = (now = Date.now()) => day(now - 6 * 3600000);
  const previousNight = (now = Date.now()) => day(now - 24 * 3600000);
  const sleepNight = lastSleep => {
    const at=Date.parse(lastSleep?.at);
    return Number.isFinite(at)?night(at):lastSleep?.nightDate;
  };
  // Daytime sleep ends at 18:00 JST; night reports retain the 06:00 boundary.
  // Derive from the original report so persisted records need no migration.
  function daytimeEnd(lastSleep) {
    const at=Date.parse(lastSleep?.at);
    if (!Number.isFinite(at)) return null;
    const report=parts(at);
    return report.hour>=6 && report.hour<18 ? Date.parse(`${report.day}T18:00:00+09:00`) : null;
  }
  const expired = (lastSleep, now = Date.now()) => {
    const end=daytimeEnd(lastSleep);
    return end!==null && now>=end;
  };
  function morningDue(lastSleep, morningDays, now = Date.now()) {
    const current = parts(now);
    if (!lastSleep || expired(lastSleep,now) || sleepNight(lastSleep) !== previousNight(now) || morningDays.includes(current.day)
      || current.hour < rules.morningStartHour || current.hour >= rules.morningEndHour) return false;
    return true;
  }
  function openView(lastSleep, morningDays, now = Date.now()) {
    if (expired(lastSleep,now)) return 'home';
    if (morningDue(lastSleep, morningDays, now)) return 'morning';
    const current=parts(now),sleepDate=sleepNight(lastSleep);
    if (lastSleep?.finished && sleepDate===night(now)
      && !morningDays.includes(current.day)) return 'rest';
    return 'home';
  }
  return { rules, day, night, previousNight, sleepNight, daytimeEnd, expired, morningDue, openView };
})();
