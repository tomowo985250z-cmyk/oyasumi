// Wall-clock adjustments/device timezone do not move the server-anchored night.
globalThis.NightClock = (() => {
 let anchor;
 function sync(clock){if(clock&&Number.isFinite(clock.serverNow)&&Number.isFinite(clock.monotonicAt))anchor=clock;}
 const now=()=>anchor?anchor.serverNow+performance.now()-anchor.monotonicAt:Date.now();
 const remaining=()=>anchor?Math.max(0,anchor.resetAt-now()):null;
 return {sync,now,remaining,night:()=>SleepFlow.night(now()),morningNight:()=>SleepFlow.previousNight(now())};
})();
